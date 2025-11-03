"""
ThankYouAgent - Generates personalized gratitude messages and impact receipts
Part of the Stewardship Platform AI Agent System
"""

from crewai import Agent, Task, Crew
from langchain_openai import ChatOpenAI
from typing import Dict, Any
import json
from datetime import datetime

class ThankYouAgent:
    """
    Agent that creates personalized thank you messages showing specific impact.
    
    Input:
        - Member giving history
        - Project allocations
        - Impact achieved
        - Relationship history
    
    Output:
        - Personalized thank you message
        - Impact summary
        - Next steps suggestion
    
    Timing:
        - Within 48 hours of gift
        - Quarterly impact receipts
    """
    
    def __init__(self, llm_model: str = "gpt-4"):
        self.llm = ChatOpenAI(model=llm_model, temperature=0.7)
        
        self.agent = Agent(
            role='Gratitude and Impact Communicator',
            goal='Create heartfelt, personalized thank you messages that show real impact',
            backstory="""You are a pastoral care expert who understands the power of genuine 
            gratitude. You know how to make people feel valued and show them the tangible 
            difference their generosity makes. You write with warmth, specificity, and joy.""",
            verbose=True,
            allow_delegation=False,
            llm=self.llm
        )
    
    def generate_thank_you(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate personalized thank you message"""
        
        task = Task(
            description=f"""
            Create a personalized thank you message:
            
            Member: {context.get('member_name', '')}
            Gift Amount: ${context.get('amount', 0)}
            Gift Date: {context.get('gift_date', '')}
            Project Allocations: {json.dumps(context.get('allocations', []), indent=2)}
            Impact Achieved: {json.dumps(context.get('impact', {}), indent=2)}
            Giving History: {context.get('giving_history', '')}
            Relationship Notes: {context.get('relationship_notes', '')}
            
            The message should:
            1. Express genuine gratitude (first paragraph)
            2. Show specific impact of THIS gift (second paragraph)
            3. Connect to larger vision (third paragraph)
            4. Invite continued partnership (closing)
            
            Be warm, specific, and joyful. Avoid generic templates.
            Keep it 150-250 words for email.
            """,
            agent=self.agent,
            expected_output="Personalized thank you message"
        )
        
        crew = Crew(agents=[self.agent], tasks=[task], verbose=True)
        result = crew.kickoff()
        
        return {
            'message': result.output,
            'member_name': context.get('member_name'),
            'amount': context.get('amount'),
            'generated_at': datetime.now().isoformat(),
            'generated_by': 'ThankYouAgent'
        }


def thank_you_api(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """API endpoint for generating thank you messages"""
    try:
        agent = ThankYouAgent()
        result = agent.generate_thank_you(request_data)
        return {'success': True, 'thank_you': result}
    except Exception as e:
        return {'success': False, 'error': str(e)}
