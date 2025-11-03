"""
ProgressNarratorAgent - Creates milestone celebrations and progress updates
Part of the Stewardship Platform AI Agent System
"""

from crewai import Agent, Task, Crew
from langchain_openai import ChatOpenAI
from typing import Dict, Any
import json

class ProgressNarratorAgent:
    """
    Agent that crafts compelling progress updates and milestone celebrations.
    
    Input:
        - Campaign/vision progress data
        - Milestone achieved
        - Stories and testimonies
        - Goals remaining
    
    Output:
        - Celebration message
        - Progress visualization copy
        - Social media posts
        - Video script outline
    """
    
    def __init__(self, llm_model: str = "gpt-4"):
        self.llm = ChatOpenAI(model=llm_model, temperature=0.8)
        
        self.agent = Agent(
            role='Progress Celebration Storyteller',
            goal='Transform milestones into inspiring celebrations that motivate continued participation',
            backstory="""You are a communications expert who knows how to celebrate 
            wins without losing momentum. You understand the psychology of progress, 
            the power of storytelling, and how to keep people engaged in long-term 
            initiatives. You write with energy, gratitude, and forward momentum.""",
            verbose=True,
            allow_delegation=False,
            llm=self.llm
        )
    
    def narrate_progress(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate progress narrative and celebration content"""
        
        tasks = []
        
        # Task 1: Celebration message
        celebration_task = Task(
            description=f"""
            Create a celebratory progress update:
            
            Vision/Campaign: {context.get('campaign_name', '')}
            Milestone: {context.get('milestone_type', '')} - {context.get('milestone_value', '')}%
            Progress Data: {json.dumps(context.get('progress', {}), indent=2)}
            Stories: {json.dumps(context.get('stories', []), indent=2)}
            Goals Remaining: {json.dumps(context.get('remaining_goals', []), indent=2)}
            
            Structure:
            1. Celebrate the achievement (paragraph 1)
            2. Share a story of impact (paragraph 2)
            3. Show what's been accomplished (paragraph 3)
            4. Paint picture of what's next (paragraph 4)
            5. Invite continued participation (closing)
            
            Tone: Celebratory but not done, grateful, forward-looking
            Length: 300-400 words
            """,
            agent=self.agent,
            expected_output="Celebration message for email/web"
        )
        tasks.append(celebration_task)
        
        # Task 2: Social media posts
        social_task = Task(
            description="""
            Create 3 social media posts celebrating this milestone:
            - One for Twitter (280 chars)
            - One for Facebook (longer, 500 chars)
            - One for Instagram (engaging, emoji-friendly)
            
            Each should be shareable and include a visual suggestion.
            Output as JSON array with platform, text, and visual_suggestion fields.
            """,
            agent=self.agent,
            expected_output="JSON array of social media posts",
            context=[celebration_task]
        )
        tasks.append(social_task)
        
        # Task 3: Video script outline
        video_task = Task(
            description="""
            Create a 60-90 second video script outline:
            
            Opening (10 sec): Hook with milestone
            Middle (40-60 sec): Story + impact visualization
            Closing (10-20 sec): Thank you + what's next
            
            Include:
            - Suggested B-roll footage
            - Music mood
            - Text overlays
            - Call to action
            """,
            agent=self.agent,
            expected_output="Video script outline",
            context=[celebration_task]
        )
        tasks.append(video_task)
        
        crew = Crew(agents=[self.agent], tasks=tasks, verbose=True)
        result = crew.kickoff()
        
        social_posts = json.loads(result.tasks_output[1].output)
        
        return {
            'celebration_message': result.tasks_output[0].output,
            'social_media_posts': social_posts,
            'video_script': result.tasks_output[2].output,
            'milestone_type': context.get('milestone_type'),
            'milestone_value': context.get('milestone_value'),
            'generated_by': 'ProgressNarratorAgent'
        }


def progress_narrator_api(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """API endpoint for progress narration"""
    try:
        agent = ProgressNarratorAgent()
        result = agent.narrate_progress(request_data)
        return {'success': True, 'progress_narrative': result}
    except Exception as e:
        return {'success': False, 'error': str(e)}
