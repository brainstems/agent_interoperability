import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const prisma = new PrismaClient()

export class SupabaseChurchAdapter {
  // Real-time subscriptions for church data
  async subscribeToMemberUpdates(churchId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`church-${churchId}-members`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'Member',
        filter: `churchId=eq.${churchId}`
      }, callback)
      .subscribe()
  }

  async subscribeToEventUpdates(churchId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`church-${churchId}-events`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'Event',
        filter: `churchId=eq.${churchId}`
      }, callback)
      .subscribe()
  }

  // File storage for church media
  async uploadChurchMedia(churchId: string, file: File, folder: 'photos' | 'documents' | 'media') {
    const fileName = `${churchId}/${folder}/${Date.now()}-${file.name}`
    
    const { data, error } = await supabase.storage
      .from('church-media')
      .upload(fileName, file)

    if (error) throw error
    return data
  }

  async getMediaUrl(path: string) {
    const { data } = supabase.storage
      .from('church-media')
      .getPublicUrl(path)
    
    return data.publicUrl
  }

  // Row Level Security policies (run these in Supabase SQL editor)
  static getRLSPolicies() {
    return `
      -- Enable RLS on church tables
      ALTER TABLE "Church" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "Member" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "Donation" ENABLE ROW LEVEL SECURITY;

      -- Policy: Users can only access their church's data
      CREATE POLICY "church_isolation" ON "Member"
        FOR ALL USING (
          "churchId" IN (
            SELECT "churchId" FROM "User" WHERE "id" = auth.uid()
          )
        );

      CREATE POLICY "church_isolation" ON "Event"
        FOR ALL USING (
          "churchId" IN (
            SELECT "churchId" FROM "User" WHERE "id" = auth.uid()
          )
        );

      CREATE POLICY "church_isolation" ON "Donation"
        FOR ALL USING (
          "churchId" IN (
            SELECT "churchId" FROM "User" WHERE "id" = auth.uid()
          )
        );
    `
  }

  // Edge Function deployment helper
  static getEdgeFunctionCode() {
    return `
      // Deploy this as a Supabase Edge Function for AI processing
      import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
      import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

      serve(async (req) => {
        const { churchId, agentType, prompt, variables } = await req.json()
        
        // Process AI request using our prompt management system
        // This runs on the edge for better performance
        
        return new Response(
          JSON.stringify({ success: true, response: "AI processing complete" }),
          { headers: { "Content-Type": "application/json" } }
        )
      })
    `
  }
}

export { supabase }
