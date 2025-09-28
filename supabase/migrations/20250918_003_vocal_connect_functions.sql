-- Vocal Connect AI Integration Functions
-- Supporting functions for volunteer matching, analytics, and performance tracking

-- Function to find matching volunteers for an assistance case
CREATE OR REPLACE FUNCTION public.find_matching_volunteers(
  p_case_id UUID,
  p_church_id UUID,
  p_max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  profile_id UUID,
  service_radius_km INTEGER,
  risk_tier volunteer_risk_tier,
  reliability_score DECIMAL(3,2),
  total_tasks_completed INTEGER,
  matching_score DECIMAL(5,3),
  distance_km DECIMAL(8,3)
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  case_lat DECIMAL(10,8);
  case_lng DECIMAL(11,8);
  case_urgency assistance_urgency;
  case_window_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get case details
  SELECT geo_lat, geo_lng, urgency, window_end
  INTO case_lat, case_lng, case_urgency, case_window_end
  FROM public.member_assistance_cases
  WHERE member_assistance_cases.id = p_case_id;

  RETURN QUERY
  SELECT 
    cv.id,
    cv.profile_id,
    cv.service_radius_km,
    cv.risk_tier,
    cv.reliability_score,
    cv.total_tasks_completed,
    -- Calculate matching score based on multiple factors
    CASE 
      WHEN case_lat IS NULL OR case_lng IS NULL THEN cv.reliability_score
      ELSE (
        -- Base reliability score (0.0-1.0)
        cv.reliability_score * 0.4 +
        -- Distance factor (closer = better, max 1.0)
        GREATEST(0, 1.0 - (
          ST_Distance(
            ST_Point(case_lng, case_lat)::geography,
            ST_Point(-74.006, 40.7128)::geography -- Default NYC coords if volunteer location unknown
          ) / 1000.0 / cv.service_radius_km
        )) * 0.3 +
        -- Availability factor (has quota remaining)
        CASE WHEN cv.weekly_task_quota_used < cv.max_tasks_per_week THEN 0.2 ELSE 0.0 END +
        -- Experience factor
        LEAST(1.0, cv.total_tasks_completed / 10.0) * 0.1
      )
    END::DECIMAL(5,3) AS matching_score,
    -- Calculate actual distance if coordinates available
    CASE 
      WHEN case_lat IS NULL OR case_lng IS NULL THEN NULL
      ELSE ST_Distance(
        ST_Point(case_lng, case_lat)::geography,
        ST_Point(-74.006, 40.7128)::geography -- Default coords
      ) / 1000.0
    END::DECIMAL(8,3) AS distance_km
  FROM public.church_volunteers cv
  WHERE cv.church_id = p_church_id
    AND cv.active = true
    AND cv.paused = false
    AND cv.verification_status = 'approved'
    AND cv.weekly_task_quota_used < cv.max_tasks_per_week
    -- Check if volunteer is available during case window
    AND EXISTS (
      SELECT 1 FROM public.volunteer_availability va
      WHERE va.volunteer_id = cv.id
        AND va.active = true
        AND (
          -- Recurring availability
          (va.availability_type = 'recurring' 
           AND EXTRACT(DOW FROM case_window_end) = ANY(va.days_of_week)
           AND va.start_time <= case_window_end::TIME
           AND va.end_time >= case_window_end::TIME)
          OR
          -- Ad-hoc availability
          (va.availability_type = 'adhoc'
           AND va.start_datetime <= case_window_end
           AND va.end_datetime >= case_window_end)
        )
    )
  ORDER BY matching_score DESC, cv.reliability_score DESC
  LIMIT p_max_results;
END;
$$;

-- Function to update volunteer completion stats
CREATE OR REPLACE FUNCTION public.update_volunteer_completion_stats(
  p_volunteer_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_week_start DATE;
  completed_this_week INTEGER;
  total_completed INTEGER;
  avg_rating DECIMAL(3,2);
BEGIN
  -- Calculate current week start (Monday)
  current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
  
  -- Count completed tasks this week
  SELECT COUNT(*)
  INTO completed_this_week
  FROM public.member_assistance_cases mac
  WHERE mac.assigned_volunteer_id = p_volunteer_id
    AND mac.status = 'completed'
    AND mac.completed_at >= current_week_start;
  
  -- Count total completed tasks
  SELECT COUNT(*)
  INTO total_completed
  FROM public.member_assistance_cases mac
  WHERE mac.assigned_volunteer_id = p_volunteer_id
    AND mac.status = 'completed';
  
  -- Calculate average reliability (simplified - could be more sophisticated)
  -- For now, just increment reliability slightly for each completion
  UPDATE public.church_volunteers
  SET 
    weekly_task_quota_used = completed_this_week,
    total_tasks_completed = total_completed,
    reliability_score = LEAST(1.0, reliability_score + 0.02),
    quota_reset_date = CASE 
      WHEN quota_reset_date < current_week_start THEN current_week_start + INTERVAL '7 days'
      ELSE quota_reset_date
    END
  WHERE id = p_volunteer_id;
END;
$$;

-- Function to get volunteer analytics for a church
CREATE OR REPLACE FUNCTION public.get_volunteer_analytics(
  p_church_id UUID
)
RETURNS TABLE (
  total_volunteers INTEGER,
  active_volunteers INTEGER,
  verified_volunteers INTEGER,
  avg_reliability_score DECIMAL(5,3),
  total_tasks_completed INTEGER,
  tasks_this_week INTEGER,
  volunteers_by_risk_tier JSONB,
  top_volunteers JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER AS total_volunteers,
    COUNT(*) FILTER (WHERE active = true AND paused = false)::INTEGER AS active_volunteers,
    COUNT(*) FILTER (WHERE verification_status = 'approved')::INTEGER AS verified_volunteers,
    AVG(reliability_score)::DECIMAL(5,3) AS avg_reliability_score,
    SUM(total_tasks_completed)::INTEGER AS total_tasks_completed,
    SUM(weekly_task_quota_used)::INTEGER AS tasks_this_week,
    -- Risk tier distribution
    jsonb_build_object(
      'R0', COUNT(*) FILTER (WHERE risk_tier = 'R0'),
      'R1', COUNT(*) FILTER (WHERE risk_tier = 'R1'),
      'R2', COUNT(*) FILTER (WHERE risk_tier = 'R2')
    ) AS volunteers_by_risk_tier,
    -- Top 5 volunteers by reliability and completion
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'volunteer_id', cv.id,
          'profile_id', cv.profile_id,
          'reliability_score', cv.reliability_score,
          'total_completed', cv.total_tasks_completed,
          'risk_tier', cv.risk_tier
        )
      )
      FROM (
        SELECT cv2.id, cv2.profile_id, cv2.reliability_score, cv2.total_tasks_completed, cv2.risk_tier
        FROM public.church_volunteers cv2
        WHERE cv2.church_id = p_church_id
          AND cv2.active = true
        ORDER BY cv2.reliability_score DESC, cv2.total_tasks_completed DESC
        LIMIT 5
      ) cv
    ) AS top_volunteers
  FROM public.church_volunteers
  WHERE church_id = p_church_id;
END;
$$;

-- Function to get case metrics and analytics
CREATE OR REPLACE FUNCTION public.get_case_metrics(
  p_church_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  total_cases INTEGER,
  open_cases INTEGER,
  completed_cases INTEGER,
  escalated_cases INTEGER,
  avg_completion_time_hours DECIMAL(8,2),
  cases_by_type JSONB,
  cases_by_urgency JSONB,
  completion_rate DECIMAL(5,2),
  volunteer_response_rate DECIMAL(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  date_filter_start TIMESTAMP WITH TIME ZONE;
  date_filter_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Set default date range if not provided (last 30 days)
  date_filter_start := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  date_filter_end := COALESCE(p_end_date, NOW());

  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER AS total_cases,
    COUNT(*) FILTER (WHERE status IN ('open', 'pending_offer', 'assigned', 'in_progress'))::INTEGER AS open_cases,
    COUNT(*) FILTER (WHERE status = 'completed')::INTEGER AS completed_cases,
    COUNT(*) FILTER (WHERE status = 'escalated')::INTEGER AS escalated_cases,
    
    -- Average completion time for completed cases
    AVG(
      EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600.0
    ) FILTER (WHERE status = 'completed' AND completed_at IS NOT NULL)::DECIMAL(8,2) AS avg_completion_time_hours,
    
    -- Cases by type
    (
      SELECT jsonb_object_agg(case_type, case_count)
      FROM (
        SELECT case_type, COUNT(*) as case_count
        FROM public.member_assistance_cases mac2
        WHERE mac2.church_id = p_church_id
          AND mac2.created_at >= date_filter_start
          AND mac2.created_at <= date_filter_end
        GROUP BY case_type
      ) case_types
    ) AS cases_by_type,
    
    -- Cases by urgency
    jsonb_build_object(
      'today', COUNT(*) FILTER (WHERE urgency = 'today'),
      'this_week', COUNT(*) FILTER (WHERE urgency = 'this_week'),
      'flexible', COUNT(*) FILTER (WHERE urgency = 'flexible')
    ) AS cases_by_urgency,
    
    -- Completion rate
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / COUNT(*) * 100)::DECIMAL(5,2)
      ELSE 0
    END AS completion_rate,
    
    -- Volunteer response rate (offers accepted / offers sent)
    COALESCE(
      (
        SELECT 
          CASE 
            WHEN COUNT(*) > 0 THEN 
              (COUNT(*) FILTER (WHERE status = 'accepted')::DECIMAL / COUNT(*) * 100)::DECIMAL(5,2)
            ELSE 0
          END
        FROM public.volunteer_offers vo
        JOIN public.member_assistance_cases mac3 ON vo.case_id = mac3.id
        WHERE mac3.church_id = p_church_id
          AND vo.created_at >= date_filter_start
          AND vo.created_at <= date_filter_end
      ), 0
    ) AS volunteer_response_rate
    
  FROM public.member_assistance_cases mac
  WHERE mac.church_id = p_church_id
    AND mac.created_at >= date_filter_start
    AND mac.created_at <= date_filter_end;
END;
$$;

-- Function to clean up expired volunteer offers
CREATE OR REPLACE FUNCTION public.cleanup_expired_offers()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Update expired offers
  UPDATE public.volunteer_offers
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$;

-- Function to reset weekly volunteer quotas
CREATE OR REPLACE FUNCTION public.reset_weekly_quotas()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reset_count INTEGER;
  current_week_start DATE;
BEGIN
  current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
  
  -- Reset quotas for volunteers whose reset date has passed
  UPDATE public.church_volunteers
  SET 
    weekly_task_quota_used = 0,
    quota_reset_date = current_week_start + INTERVAL '7 days'
  WHERE quota_reset_date <= current_week_start;
  
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  
  RETURN reset_count;
END;
$$;

-- Function to get volunteer availability for a specific time window
CREATE OR REPLACE FUNCTION public.get_available_volunteers(
  p_church_id UUID,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  volunteer_id UUID,
  profile_id UUID,
  availability_type volunteer_availability_type,
  available_start TIMESTAMP WITH TIME ZONE,
  available_end TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cv.id AS volunteer_id,
    cv.profile_id,
    va.availability_type,
    CASE 
      WHEN va.availability_type = 'recurring' THEN
        -- Calculate next occurrence of recurring availability
        (DATE_TRUNC('week', p_start_time) + 
         (va.days_of_week[1] || ' days')::INTERVAL + 
         va.start_time::INTERVAL)::TIMESTAMP WITH TIME ZONE
      ELSE va.start_datetime
    END AS available_start,
    CASE 
      WHEN va.availability_type = 'recurring' THEN
        (DATE_TRUNC('week', p_start_time) + 
         (va.days_of_week[1] || ' days')::INTERVAL + 
         va.end_time::INTERVAL)::TIMESTAMP WITH TIME ZONE
      ELSE va.end_datetime
    END AS available_end
  FROM public.church_volunteers cv
  JOIN public.volunteer_availability va ON cv.id = va.volunteer_id
  WHERE cv.church_id = p_church_id
    AND cv.active = true
    AND cv.paused = false
    AND va.active = true
    AND (
      -- Recurring availability check
      (va.availability_type = 'recurring' 
       AND EXTRACT(DOW FROM p_start_time) = ANY(va.days_of_week)
       AND va.start_time <= p_start_time::TIME
       AND va.end_time >= p_end_time::TIME)
      OR
      -- Ad-hoc availability check
      (va.availability_type = 'adhoc'
       AND va.start_datetime <= p_start_time
       AND va.end_datetime >= p_end_time)
    );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.find_matching_volunteers TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_volunteer_completion_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_volunteer_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_case_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_offers TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_weekly_quotas TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_volunteers TO authenticated;
