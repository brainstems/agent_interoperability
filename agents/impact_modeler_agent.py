"""
ImpactModelerAgent - Calculates impact conversion rates from historical data
Part of the Stewardship Platform AI Agent System
"""

from crewai import Agent, Task, Crew
from langchain.tools import Tool
from langchain_openai import ChatOpenAI
from typing import Dict, Any, List
import json

class ImpactModelerAgent:
    """
    Agent that analyzes budgets and costs to determine impact conversion rates.
    
    Input:
        - Budget line items
        - Historical costs
        - Project descriptions
        - Outcome metrics
    
    Output:
        - Impact per $100 donated
        - Impact unit (e.g., "meals served", "families helped")
        - Narrative template
        - Example outcomes
        - Confidence level
    
    Tools:
        - Budget analysis
        - Unit cost calculation
        - Historical data analysis
    """
    
    def __init__(self, llm_model: str = "gpt-4"):
        self.llm = ChatOpenAI(model=llm_model, temperature=0.3)  # Lower temp for numerical work
        
        self.agent = Agent(
            role='Impact Model Analyst',
            goal='Calculate realistic, verifiable impact conversion rates from financial data',
            backstory="""You are a financial analyst and program evaluator with expertise 
            in nonprofit budgeting and impact measurement. You understand how to break down 
            complex budgets into unit costs and translate financial inputs into tangible 
            outcomes. You are meticulous about accuracy and always provide confidence levels.""",
            verbose=True,
            allow_delegation=False,
            llm=self.llm
        )
    
    def create_modeling_tasks(self, context: Dict[str, Any]) -> list:
        """Create tasks for impact modeling"""
        
        tasks = []
        
        # Task 1: Analyze budget and calculate unit costs
        analysis_task = Task(
            description=f"""
            Analyze the following budget and calculate unit costs:
            
            Project: {context.get('project_name', '')}
            Description: {context.get('project_description', '')}
            Total Budget: ${context.get('total_budget', 0)}
            Budget Breakdown: {json.dumps(context.get('budget_breakdown', {}), indent=2)}
            Expected Outcomes: {context.get('expected_outcomes', '')}
            Historical Data: {json.dumps(context.get('historical_data', {}), indent=2)}
            
            Calculate:
            1. Direct cost per outcome unit
            2. Overhead allocation per unit
            3. Total cost per outcome unit
            4. Impact per $100 donated
            
            Show your work and reasoning. Be conservative in your estimates.
            """,
            agent=self.agent,
            expected_output="Detailed analysis with unit cost calculations"
        )
        tasks.append(analysis_task)
        
        # Task 2: Determine impact unit and conversion rate
        unit_task = Task(
            description="""
            Based on the budget analysis:
            
            1. Define the most meaningful impact unit (e.g., "meals served", "families helped", "students tutored")
            2. Calculate impact per $100 donated
            3. Provide a confidence level (LOW, MEDIUM, HIGH)
            4. List assumptions and caveats
            
            Output as JSON with keys: impact_unit, impact_per_100_dollars, confidence, assumptions
            """,
            agent=self.agent,
            expected_output="JSON with impact metrics",
            context=[analysis_task]
        )
        tasks.append(unit_task)
        
        # Task 3: Create narrative template
        narrative_task = Task(
            description="""
            Create a narrative template that explains the impact. Include placeholders:
            - {amount} for dollar amount
            - {impact} for calculated impact value
            - {unit} for impact unit
            
            The narrative should:
            - Be clear and concrete
            - Avoid exaggeration
            - Inspire confidence
            - Be 2-3 sentences
            
            Example: "Your {amount} gift will provide {impact} {unit} to families in need, 
            giving them not just food, but hope and dignity."
            """,
            agent=self.agent,
            expected_output="Narrative template string with placeholders",
            context=[analysis_task, unit_task]
        )
        tasks.append(narrative_task)
        
        # Task 4: Generate example outcomes
        examples_task = Task(
            description="""
            Generate 5 concrete example outcomes at different giving levels:
            - $25
            - $50
            - $100
            - $250
            - $500
            
            Each example should be specific and tangible. 
            Output as JSON array of strings.
            
            Example: ["$25 provides 3 meals for a family", "$50 provides a week of groceries"]
            """,
            agent=self.agent,
            expected_output="JSON array of example outcome strings",
            context=[analysis_task, unit_task]
        )
        tasks.append(examples_task)
        
        return tasks
    
    def model_impact(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the impact modeling process
        
        Args:
            context: Dictionary with project details, budget, historical data
        
        Returns:
            Dictionary with impact metrics and narrative
        """
        
        # Create tasks
        tasks = self.create_modeling_tasks(context)
        
        # Create crew
        crew = Crew(
            agents=[self.agent],
            tasks=tasks,
            verbose=True
        )
        
        # Execute
        result = crew.kickoff()
        
        # Parse results
        impact_metrics = json.loads(result.tasks_output[1].output)
        example_outcomes = json.loads(result.tasks_output[3].output)
        
        output = {
            'analysis': result.tasks_output[0].output,
            'impact_unit': impact_metrics['impact_unit'],
            'impact_per_100_dollars': impact_metrics['impact_per_100_dollars'],
            'confidence_level': impact_metrics['confidence'],
            'assumptions': impact_metrics['assumptions'],
            'impact_narrative_template': result.tasks_output[2].output,
            'example_outcomes': example_outcomes,
            'generated_by': 'ImpactModelerAgent'
        }
        
        return output


def model_impact_api(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    API endpoint wrapper for impact modeling
    
    Usage:
        POST /api/ai/model-impact
        {
            "project_name": "Community Food Program",
            "project_description": "Providing meals to food-insecure families",
            "total_budget": 50000,
            "budget_breakdown": {
                "food_costs": 35000,
                "delivery": 5000,
                "staff": 8000,
                "overhead": 2000
            },
            "expected_outcomes": "1000 meals per month",
            "historical_data": {
                "meals_served_last_year": 12000,
                "cost_last_year": 48000
            }
        }
    """
    
    try:
        agent = ImpactModelerAgent()
        result = agent.model_impact(request_data)
        
        return {
            'success': True,
            'impact_model': result
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


if __name__ == "__main__":
    # Test the agent
    test_context = {
        'project_name': 'Backpack Program',
        'project_description': 'Providing school supplies to students in need',
        'total_budget': 10000,
        'budget_breakdown': {
            'backpacks': 3000,
            'school_supplies': 5000,
            'delivery_distribution': 1000,
            'overhead': 1000
        },
        'expected_outcomes': '300 students equipped',
        'historical_data': {
            'students_helped_last_year': 250,
            'cost_last_year': 8500,
            'cost_per_backpack': 33
        }
    }
    
    agent = ImpactModelerAgent()
    result = agent.model_impact(test_context)
    
    print("\n=== IMPACT MODEL ===")
    print(f"Impact Unit: {result['impact_unit']}")
    print(f"Impact per $100: {result['impact_per_100_dollars']}")
    print(f"Confidence: {result['confidence_level']}")
    print(f"\nNarrative: {result['impact_narrative_template']}")
    print(f"\nExamples: {json.dumps(result['example_outcomes'], indent=2)}")
