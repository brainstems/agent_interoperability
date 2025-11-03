"""
MessageComposerAgent - Generates channel-specific content with consistency
Part of the Stewardship Platform AI Agent System
"""

from crewai import Agent, Task, Crew
from langchain.tools import Tool
from langchain_openai import ChatOpenAI
from typing import Dict, Any, List
import json

class MessageComposerAgent:
    """
    Agent that generates consistent, channel-optimized content for communication sequences.
    
    Input:
        - Vision anchor
        - Channel (email, SMS, push, social)
        - Audience segment
        - Call to action
        - Tone guidelines
    
    Output:
        - Subject line / headline
        - Body copy
        - CTA text
        - Alt versions for A/B testing
    
    Guardrails:
        - Consistency with vision
        - No manipulation
        - Appropriate length for channel
        - Accessible language
    """
    
    def __init__(self, llm_model: str = "gpt-4"):
        self.llm = ChatOpenAI(model=llm_model, temperature=0.8)  # Higher temp for creativity
        
        self.agent = Agent(
            role='Multi-Channel Content Creator',
            goal='Craft compelling, consistent messages optimized for each communication channel',
            backstory="""You are an expert in multi-channel marketing and church communications. 
            You understand how to adapt messages for different platforms while maintaining brand 
            consistency. You know email best practices, SMS character limits, push notification 
            psychology, and social media engagement. You write with warmth, clarity, and purpose.""",
            verbose=True,
            allow_delegation=False,
            llm=self.llm
        )
    
    def create_composition_tasks(self, context: Dict[str, Any]) -> list:
        """Create tasks for message composition"""
        
        tasks = []
        channel = context.get('channel', 'email')
        
        # Get channel-specific constraints
        constraints = self.get_channel_constraints(channel)
        
        # Task 1: Generate subject/headline
        subject_task = Task(
            description=f"""
            Create a compelling {constraints['subject_type']} for this message:
            
            Vision Anchor: {context.get('vision_anchor', '')}
            Message Purpose: {context.get('purpose', '')}
            Target Audience: {context.get('audience', '')}
            Key Message: {context.get('key_message', '')}
            
            Requirements:
            - Maximum {constraints['subject_length']} characters
            - Include {constraints['subject_elements']}
            - Avoid spam triggers
            - Create urgency without manipulation
            
            Generate 3 variations for A/B testing.
            Output as JSON array.
            """,
            agent=self.agent,
            expected_output=f"JSON array of 3 {constraints['subject_type']} options"
        )
        tasks.append(subject_task)
        
        # Task 2: Compose body content
        body_task = Task(
            description=f"""
            Write the message body for {channel}:
            
            Vision Anchor: {context.get('vision_anchor', '')}
            Message Purpose: {context.get('purpose', '')}
            Key Points: {json.dumps(context.get('key_points', []), indent=2)}
            Tone: {context.get('tone', 'warm, hopeful, conversational')}
            Call to Action: {context.get('cta', '')}
            
            Channel Requirements:
            - Maximum length: {constraints['body_length']}
            - Format: {constraints['format']}
            - Style: {constraints['style']}
            
            Structure:
            1. Hook (connect to vision)
            2. Body (key message)
            3. CTA (clear next step)
            4. Sign-off
            
            Maintain consistency with the vision anchor while being concise and actionable.
            """,
            agent=self.agent,
            expected_output=f"Message body optimized for {channel}",
            context=[subject_task]
        )
        tasks.append(body_task)
        
        # Task 3: Create CTA variations
        cta_task = Task(
            description=f"""
            Create 3 call-to-action variations that:
            - Are {constraints['cta_length']}
            - Use action verbs
            - Create urgency appropriately
            - Are specific and clear
            - Align with the vision
            
            Base CTA: {context.get('cta', 'Learn More')}
            
            Output as JSON array.
            """,
            agent=self.agent,
            expected_output="JSON array of 3 CTA text options"
        )
        tasks.append(cta_task)
        
        # Task 4: Accessibility check
        accessibility_task = Task(
            description="""
            Review the message for accessibility:
            - Reading level (aim for 8th grade)
            - Inclusive language
            - Clear structure
            - Alt text suggestions for images
            
            Provide specific recommendations for improvement.
            """,
            agent=self.agent,
            expected_output="Accessibility review with recommendations",
            context=[body_task]
        )
        tasks.append(accessibility_task)
        
        return tasks
    
    def get_channel_constraints(self, channel: str) -> Dict[str, Any]:
        """Get constraints for different channels"""
        constraints = {
            'email': {
                'subject_type': 'subject line',
                'subject_length': 50,
                'subject_elements': 'personalization, benefit, or curiosity',
                'body_length': '200-300 words',
                'format': 'HTML with plain text fallback',
                'style': 'conversational paragraphs',
                'cta_length': '3-5 words'
            },
            'sms': {
                'subject_type': 'opening line',
                'subject_length': 25,
                'subject_elements': 'name and hook',
                'body_length': '160 characters total',
                'format': 'plain text',
                'style': 'ultra-concise',
                'cta_length': '2-3 words'
            },
            'push': {
                'subject_type': 'notification title',
                'subject_length': 40,
                'subject_elements': 'urgency or benefit',
                'body_length': '120 characters',
                'format': 'plain text',
                'style': 'immediate, actionable',
                'cta_length': '2 words'
            },
            'social': {
                'subject_type': 'hook line',
                'subject_length': 60,
                'subject_elements': 'emotion or question',
                'body_length': '280 characters (Twitter) or 500 (Facebook)',
                'format': 'plain text with emojis',
                'style': 'engaging, shareable',
                'cta_length': '2-4 words with link'
            }
        }
        return constraints.get(channel, constraints['email'])
    
    def compose_message(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the message composition process
        
        Args:
            context: Dictionary with vision, channel, audience, purpose, key_message, cta
        
        Returns:
            Dictionary with message components
        """
        
        # Create tasks
        tasks = self.create_composition_tasks(context)
        
        # Create crew
        crew = Crew(
            agents=[self.agent],
            tasks=tasks,
            verbose=True
        )
        
        # Execute
        result = crew.kickoff()
        
        # Parse results
        subject_variations = json.loads(result.tasks_output[0].output)
        cta_variations = json.loads(result.tasks_output[2].output)
        
        output = {
            'channel': context.get('channel', 'email'),
            'subject_variations': subject_variations,
            'body': result.tasks_output[1].output,
            'cta_variations': cta_variations,
            'accessibility_review': result.tasks_output[3].output,
            'generated_by': 'MessageComposerAgent'
        }
        
        return output


def compose_message_api(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    API endpoint wrapper for message composition
    
    Usage:
        POST /api/ai/compose-message
        {
            "vision_anchor": "Loving our neighbors as ourselves",
            "channel": "email",
            "audience": "active givers",
            "purpose": "campaign launch",
            "key_message": "Introducing Neighbor by Name 2026",
            "key_points": [
                "New vision for radical hospitality",
                "Focus on local community",
                "Multiple ways to participate"
            ],
            "tone": "warm, hopeful, conversational",
            "cta": "Learn about the vision"
        }
    """
    
    try:
        agent = MessageComposerAgent()
        result = agent.compose_message(request_data)
        
        return {
            'success': True,
            'message': result
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


if __name__ == "__main__":
    # Test the agent
    test_context = {
        'vision_anchor': 'Loving our neighbors by name, one relationship at a time',
        'channel': 'email',
        'audience': 'active members',
        'purpose': 'vision launch',
        'key_message': 'We are launching Neighbor by Name 2026',
        'key_points': [
            'Building genuine relationships with those around us',
            'Practical ways to show Christ love',
            'Everyone has something to offer'
        ],
        'tone': 'warm, inviting, hopeful',
        'cta': 'Discover your part in the vision'
    }
    
    agent = MessageComposerAgent()
    result = agent.compose_message(test_context)
    
    print("\n=== MESSAGE COMPOSITION ===")
    print(f"Channel: {result['channel']}")
    print(f"\nSubject Options:")
    for i, subject in enumerate(result['subject_variations'], 1):
        print(f"  {i}. {subject}")
    print(f"\nBody:\n{result['body']}")
    print(f"\nCTA Options:")
    for i, cta in enumerate(result['cta_variations'], 1):
        print(f"  {i}. {cta}")
