"""
SegmenterAgent - Suggests member segments based on behavior patterns
Part of the Stewardship Platform AI Agent System
"""

from crewai import Agent, Task, Crew
from langchain_openai import ChatOpenAI
from typing import Dict, Any
import json

class SegmenterAgent:
    """
    Agent that analyzes member data and suggests meaningful segments.
    
    Input:
        - Member behavior data
        - Campaign context
        - Propensity scores
        - Engagement patterns
    
    Output:
        - Segment definitions (DSL format)
        - Segment names and descriptions
        - Expected size estimates
        - Recommended actions per segment
    """
    
    def __init__(self, llm_model: str = "gpt-4"):
        self.llm = ChatOpenAI(model=llm_model, temperature=0.6)
        
        self.agent = Agent(
            role='Behavioral Segmentation Analyst',
            goal='Identify meaningful member segments for targeted engagement',
            backstory="""You are a data analyst and marketing strategist with expertise 
            in behavioral segmentation. You understand how to find patterns in member 
            data and create actionable segments. You balance statistical rigor with 
            practical ministry application.""",
            verbose=True,
            allow_delegation=False,
            llm=self.llm
        )
    
    def suggest_segments(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate segment suggestions based on data"""
        
        task = Task(
            description=f"""
            Analyze member data and suggest 4-6 actionable segments:
            
            Campaign Context: {context.get('campaign_context', '')}
            Data Summary: {json.dumps(context.get('data_summary', {}), indent=2)}
            Available Fields: {json.dumps(context.get('available_fields', []), indent=2)}
            Goals: {context.get('segmentation_goals', '')}
            
            For each segment, provide:
            1. Segment name (clear, memorable)
            2. Description (2-3 sentences)
            3. DSL definition using available fields
            4. Estimated size (% of total)
            5. Recommended action/message
            
            DSL operators: eq, neq, gt, gte, lt, lte, in, not_in, contains
            DSL combiners: all, any, none
            
            Example DSL:
            {{
              "all": [
                {{"field": "attendance_rate_12m", "op": "gte", "value": 0.5}},
                {{"field": "propensity_to_give", "op": "gte", "value": 0.7}},
                {{"field": "giving_history.total_12m", "op": "eq", "value": 0}}
              ]
            }}
            
            Focus on segments that are:
            - Actionable (can target with specific message)
            - Sizable (at least 5% of congregation)
            - Strategic (aligned with campaign goals)
            
            Output as JSON array of segment objects.
            """,
            agent=self.agent,
            expected_output="JSON array of segment definitions"
        )
        
        crew = Crew(agents=[self.agent], tasks=[task], verbose=True)
        result = crew.kickoff()
        
        segments = json.loads(result.output)
        
        return {
            'suggested_segments': segments,
            'campaign_context': context.get('campaign_context'),
            'generated_by': 'SegmenterAgent'
        }


def segmenter_api(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """API endpoint for segment suggestions"""
    try:
        agent = SegmenterAgent()
        result = agent.suggest_segments(request_data)
        return {'success': True, 'segments': result}
    except Exception as e:
        return {'success': False, 'error': str(e)}


if __name__ == "__main__":
    test_context = {
        'campaign_context': 'Neighbor by Name 2026 - local community focus',
        'data_summary': {
            'total_members': 500,
            'active_givers': 200,
            'avg_attendance_rate': 0.4,
            'avg_propensity_to_give': 0.35
        },
        'available_fields': [
            'attendance_rate_12m',
            'propensity_to_give',
            'propensity_to_serve',
            'giving_history.total_12m',
            'engagement_score',
            'volunteer_hours_12m'
        ],
        'segmentation_goals': 'Identify high-potential non-givers and re-engage lapsed givers'
    }
    
    agent = SegmenterAgent()
    result = agent.suggest_segments(test_context)
    
    print("\n=== SUGGESTED SEGMENTS ===")
    print(json.dumps(result['suggested_segments'], indent=2))
