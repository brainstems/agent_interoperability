# CrewAI Integration Architecture

## Overview

The Windsurf Church CRM has been enhanced with CrewAI framework integration to replace the custom AI agent system with a more robust, scalable, and database-driven agent orchestration platform. This integration provides sophisticated multi-agent workflows for church operations while maintaining backward compatibility with existing systems.

## Architecture Components

### 1. Database Schema (`supabase/migrations/20250914_004_crewai_agents.sql`)

**Core Tables:**
- `crewai_agents`: Individual AI agents with roles, goals, and capabilities
- `crewai_crews`: Collections of agents working together on complex tasks
- `crewai_tasks`: Specific tasks within crew workflows
- `crewai_tools`: Available tools that agents can use
- `crewai_executions`: Runtime execution tracking and results
- `crewai_logs`: Detailed logging for debugging and monitoring
- `crewai_memory`: Persistent agent memory for learning and context

**Relationship Tables:**
- `crewai_crew_agents`: Many-to-many relationship between crews and agents
- `crewai_agent_tools`: Many-to-many relationship between agents and tools

### 2. LangChain Tools (`src/lib/langchain-tools.ts`)

**Available Tools:**
- `MemberLookupTool`: Search and retrieve church member information
- `CommunicationSenderTool`: Send emails, SMS, and push notifications
- `MemberMatchingTool`: Find compatible members for fellowship connections
- `CareSchedulerTool`: Schedule pastoral care visits and follow-ups
- `EventAnalyzerTool`: Analyze church events for insights and follow-up opportunities
- `GivingAnalyzerTool`: Analyze giving patterns and generate stewardship insights
- `IntroductionCreatorTool`: Create personalized member introductions

**Tool Factory:**
- `ChurchToolFactory`: Centralized tool creation and management
- Dynamic tool instantiation based on church context
- Consistent interface for all church-specific operations

### 3. Configuration Management (`src/lib/crewai-config.ts`)

**CrewAIConfigService Features:**
- Database-driven agent and crew configuration
- Default templates for common church operations
- Dynamic configuration updates without code changes
- Validation and error handling for configurations

### 4. Orchestration Service (`src/lib/crewai-orchestrator.ts`)

**CrewAIOrchestrator Capabilities:**
- Execute complete crew workflows
- Run individual agent tasks
- Handle execution context and metadata
- Manage agent memory and learning
- Real-time execution monitoring

**Predefined Workflows:**
- Pastoral Care Workflow
- Member Engagement Workflow
- Event Follow-up Workflow
- Giving Analysis Workflow

### 5. Simplified Service Layer (`src/lib/crewai-service.ts`)

**CrewAIService Features:**
- Simplified API for common operations
- Edge Function integration
- Real-time monitoring and subscriptions
- Default configuration initialization
- Error handling and fallback mechanisms

### 6. Edge Function Integration (`supabase/functions/crewai-processor/index.ts`)

**Serverless Processing:**
- Handles crew and agent execution requests
- Integrates with Supabase database
- Provides scalable, serverless AI processing
- Supports both crew workflows and individual agent tasks

### 7. User Interface (`src/components/agents/AgentDashboard.tsx`)

**Dashboard Features:**
- Real-time execution monitoring
- Agent and crew management
- Interactive workflow execution
- Performance metrics and analytics
- Execution history and logs

## Integration with Existing System

### Backward Compatibility

The integration maintains full backward compatibility with the existing AI agent system:

1. **Hybrid Processing**: The `AIAgentService` now supports both CrewAI and legacy processing
2. **Automatic Detection**: Tasks are automatically routed to CrewAI or legacy processors based on type
3. **Fallback Mechanism**: If CrewAI processing fails, the system falls back to legacy processors
4. **Gradual Migration**: Existing tasks continue to work while new tasks can use CrewAI

### Task Migration Mapping

```typescript
// Legacy Task Types → CrewAI Workflows
'member_matching' → executeMemberEngagementWorkflow()
'pastoral_care_reminder' → executePastoralCareWorkflow()
'event_follow_up' → executeEventFollowUpWorkflow()
'giving_analysis' → executeGivingAnalysisWorkflow()
```

## Default Agent Configurations

### 1. Pastoral Care Coordinator
- **Role**: Coordinate and manage pastoral care activities
- **Goal**: Ensure timely and compassionate care for church members
- **Tools**: member_lookup, care_scheduler, communication_sender
- **Capabilities**: Delegation enabled, memory enabled

### 2. Fellowship Coordinator
- **Role**: Foster meaningful connections within the church community
- **Goal**: Help people connect through shared interests and life stages
- **Tools**: member_lookup, member_matching, introduction_creator
- **Capabilities**: Focused execution, memory enabled

### 3. Communication Specialist
- **Role**: Ensure effective and timely communication
- **Goal**: Craft appropriate messages for different audiences
- **Tools**: member_lookup, communication_sender
- **Capabilities**: Efficient messaging, no memory needed

### 4. Stewardship Analyst
- **Role**: Analyze giving patterns and provide insights
- **Goal**: Help churches develop healthy stewardship culture
- **Tools**: giving_analyzer, member_lookup, communication_sender
- **Capabilities**: Complex analysis, memory enabled

## Default Crew Workflows

### 1. Pastoral Care Crew
- **Agents**: Pastoral Care Coordinator + Member Analyst
- **Process**: Sequential execution
- **Use Cases**: Member care needs, crisis response, follow-up coordination

### 2. Member Engagement Crew
- **Agents**: Fellowship Coordinator + Connection Specialist
- **Process**: Sequential execution
- **Use Cases**: New member integration, connection facilitation, community building

### 3. Event Follow-up Crew
- **Agents**: Event Coordinator + Communication Specialist
- **Process**: Sequential execution
- **Use Cases**: Post-event engagement, feedback collection, relationship building

### 4. Stewardship Crew
- **Agents**: Stewardship Analyst + Communication Specialist
- **Process**: Sequential execution
- **Use Cases**: Giving analysis, stewardship campaigns, donor engagement

## API Usage Examples

### Execute a Crew Workflow

```typescript
import { crewaiService } from '@/lib/crewai-service'

// Execute pastoral care workflow
const result = await crewaiService.executePastoralCareWorkflow(
  memberId,
  'VISIT', // care type
  churchId,
  userId
)
```

### Execute Individual Agent Task

```typescript
// Execute single agent task
const result = await crewaiService.executeAgent(
  'fellowship_coordinator',
  'Find potential connections for new member John Doe',
  churchId,
  { member_id: 'john-doe-id' },
  userId
)
```

### Monitor Executions

```typescript
// Subscribe to real-time execution updates
const subscription = crewaiService.subscribeToExecutions(churchId, (execution) => {
  console.log('Execution update:', execution)
})
```

## Performance and Scalability

### Database Optimization
- Indexed foreign keys for fast lookups
- RLS policies for security and multi-tenancy
- Efficient query patterns for real-time updates

### Edge Function Benefits
- Serverless scaling based on demand
- Reduced latency through edge deployment
- Cost-effective processing for variable workloads

### Memory Management
- Selective memory enablement based on agent needs
- Efficient storage of contextual information
- Automatic cleanup of old memory entries

## Security Considerations

### Role-Based Access Control
- Admin-only access to agent and crew configurations
- User-level access to execution monitoring
- Church-level data isolation through RLS

### Data Privacy
- Sensitive member information handled securely
- Audit trails for all agent actions
- Configurable data retention policies

### API Security
- Authenticated access to all endpoints
- Rate limiting on execution requests
- Input validation and sanitization

## Monitoring and Debugging

### Real-time Monitoring
- Live execution status updates
- Performance metrics and analytics
- Error tracking and alerting

### Logging System
- Detailed execution logs with metadata
- Configurable log levels (INFO, WARN, ERROR, DEBUG)
- Searchable and filterable log history

### Debug Tools
- Execution replay capabilities
- Agent behavior analysis
- Performance profiling and optimization

## Future Enhancements

### Planned Features
1. **Advanced Memory Systems**: Implement vector-based memory for better context retention
2. **Custom Tool Builder**: UI for creating custom tools without code changes
3. **Workflow Designer**: Visual workflow builder for complex multi-agent processes
4. **Analytics Dashboard**: Advanced analytics for agent performance and church insights
5. **Integration Marketplace**: Pre-built integrations with popular church software

### Extensibility
- Plugin architecture for custom agents
- API hooks for third-party integrations
- Configurable workflow templates
- Custom tool development framework

## Deployment and Maintenance

### Initial Setup
1. Run database migrations to create CrewAI tables
2. Initialize default agent and crew configurations
3. Configure environment variables for AI services
4. Deploy Edge Functions for processing

### Ongoing Maintenance
- Regular monitoring of execution performance
- Periodic cleanup of old logs and memory entries
- Updates to agent configurations based on church needs
- Performance optimization based on usage patterns

## Conclusion

The CrewAI integration transforms the Windsurf Church CRM into a sophisticated AI-powered platform that can handle complex, multi-step church operations through coordinated agent workflows. The system maintains backward compatibility while providing a foundation for advanced AI capabilities that can evolve with the church's needs.

The database-driven configuration approach ensures that church administrators can customize agent behaviors and workflows without requiring code changes, making the system both powerful and accessible to non-technical users.
