// Mock implementation of CrewAI for development and testing
// This provides the interface expected by the CrewAI orchestrator

export interface AgentConfig {
  role: string
  goal: string
  backstory: string
  tools?: any[]
  llm?: any
  verbose?: boolean
}

export interface TaskConfig {
  description: string
  agent: Agent
  expected_output?: string
  tools?: any[]
}

export interface CrewConfig {
  agents: Agent[]
  tasks: Task[]
  process?: Process
  verbose?: boolean
}

export enum Process {
  SEQUENTIAL = 'sequential',
  HIERARCHICAL = 'hierarchical'
}

export class Agent {
  constructor(public config: AgentConfig) {}

  async execute(task: string, context?: any): Promise<string> {
    // Mock execution - in production this would call actual AI models
    return `Mock response for task: ${task}`
  }
}

export class Task {
  constructor(public config: TaskConfig) {}

  async execute(context?: any): Promise<string> {
    return await this.config.agent.execute(this.config.description, context)
  }
}

export class Crew {
  private agents: Agent[]
  private tasks: Task[]
  private process: Process

  constructor(config: CrewConfig) {
    this.agents = config.agents
    this.tasks = config.tasks
    this.process = config.process || Process.SEQUENTIAL
  }

  async kickoff(inputs?: Record<string, any>): Promise<{
    result: string
    tasks_output: any[]
  }> {
    const results = []
    
    for (const task of this.tasks) {
      const result = await task.execute(inputs)
      results.push({
        description: task.config.description,
        result: result,
        agent: task.config.agent.config.role
      })
    }

    return {
      result: results.map(r => r.result).join('\n\n'),
      tasks_output: results
    }
  }
}

// Export the classes that the orchestrator expects
export { Agent as default }
