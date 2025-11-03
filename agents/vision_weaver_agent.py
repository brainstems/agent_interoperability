"""
VisionWeaverAgent - Drafts vision narratives with theological grounding
Part of the Stewardship Platform AI Agent System
"""

from crewai import Agent, Task, Crew
from langchain.tools import Tool
from langchain_openai import ChatOpenAI
from typing import Dict, Any
import json

class VisionWeaverAgent:
    """
    Agent that drafts compelling vision narratives grounded in Scripture and theology.
    
    Input:
        - Theological basis points
        - Ministry strategy elements
        - Scripture references
        - Target audience
        - Time horizon
    
    Output:
        - Full vision narrative (500-1000 words)
        - One-sentence anchor
        - FAQs (5-8 questions)
        - Small group guide
        - Youth summary
        - Kids summary
    
    Guardrails:
        - Scripture accuracy (verify references)
        - No coercion or manipulation
        - Inclusive language
        - Hope-filled tone
    """
    
    def __init__(self, llm_model: str = "gpt-4"):
        self.llm = ChatOpenAI(model=llm_model, temperature=0.7)
        
        # Define the vision weaver agent
        self.agent = Agent(
            role='Vision Narrative Architect',
            goal='Craft inspiring, theologically-grounded vision narratives that move people to action',
            backstory="""You are a pastor and theologian with 20 years of experience in 
            stewardship ministry. You understand how to ground practical ministry in deep 
            theological reflection, and you know how to communicate complex ideas in ways 
            that inspire and motivate. Your narratives balance Scripture, tradition, reason, 
            and experience (Wesleyan Quadrilateral).""",
            verbose=True,
            allow_delegation=False,
            llm=self.llm
        )
    
    def create_vision_tasks(self, context: Dict[str, Any]) -> list:
        """Create tasks for the vision weaver agent"""
        
        tasks = []
        
        # Task 1: Draft main narrative
        narrative_task = Task(
            description=f"""
            Draft a compelling vision narrative (500-1000 words) based on:
            
            Theological Basis: {context.get('theological_basis', '')}
            Ministry Strategy: {context.get('ministry_strategy', '')}
            Scripture References: {context.get('scripture_refs', [])}
            Time Horizon: {context.get('horizon', '12 months')}
            Target Audience: {context.get('audience', 'whole congregation')}
            
            The narrative should:
            1. Open with a compelling vision of the future
            2. Ground the vision in Scripture and theological reflection
            3. Explain the "why" before the "what"
            4. Paint a picture of transformation
            5. End with an invitation to participate
            
            Use inclusive language and maintain a hope-filled, non-coercive tone.
            """,
            agent=self.agent,
            expected_output="A 500-1000 word vision narrative in markdown format"
        )
        tasks.append(narrative_task)
        
        # Task 2: Create one-sentence anchor
        anchor_task = Task(
            description="""
            Distill the vision narrative into a single, memorable sentence that captures 
            its essence. This should be:
            - 15-25 words maximum
            - Theologically grounded
            - Action-oriented
            - Memorable and quotable
            - Suitable for repeated use in all communications
            """,
            agent=self.agent,
            expected_output="A single sentence (15-25 words) that anchors the entire vision",
            context=[narrative_task]
        )
        tasks.append(anchor_task)
        
        # Task 3: Generate FAQs
        faq_task = Task(
            description="""
            Anticipate and answer 5-8 frequently asked questions about this vision.
            Questions should address:
            - Why this vision now?
            - How does this align with Scripture?
            - What will change?
            - How can I participate?
            - What if I can't give financially?
            - How will we measure success?
            
            Provide clear, honest, hope-filled answers.
            """,
            agent=self.agent,
            expected_output="JSON array of objects with 'question' and 'answer' fields",
            context=[narrative_task]
        )
        tasks.append(faq_task)
        
        # Task 4: Small group guide
        group_guide_task = Task(
            description="""
            Create a small group discussion guide with:
            - Opening prayer
            - Scripture readings
            - 5-7 discussion questions
            - Reflection activity
            - Closing prayer
            - Action steps
            
            Suitable for 45-60 minute small group session.
            """,
            agent=self.agent,
            expected_output="Small group discussion guide in markdown format",
            context=[narrative_task]
        )
        tasks.append(group_guide_task)
        
        # Task 5: Youth summary
        youth_task = Task(
            description="""
            Rewrite the vision for teenagers (ages 13-18). Use:
            - Contemporary language
            - Relatable examples
            - Clear connection to their lives
            - Social media-friendly length (200-300 words)
            
            Maintain theological integrity while being accessible.
            """,
            agent=self.agent,
            expected_output="Youth-oriented vision summary (200-300 words)",
            context=[narrative_task]
        )
        tasks.append(youth_task)
        
        # Task 6: Kids summary
        kids_task = Task(
            description="""
            Simplify the vision for children (ages 6-12). Use:
            - Simple vocabulary
            - Concrete examples
            - Story-like structure
            - 100-150 words
            - Positive, encouraging tone
            """,
            agent=self.agent,
            expected_output="Child-friendly vision summary (100-150 words)",
            context=[narrative_task]
        )
        tasks.append(kids_task)
        
        return tasks
    
    def weave_vision(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the vision weaving process
        
        Args:
            context: Dictionary with theological_basis, ministry_strategy, 
                    scripture_refs, horizon, audience
        
        Returns:
            Dictionary with narrative, anchor, faqs, guides
        """
        
        # Create tasks
        tasks = self.create_vision_tasks(context)
        
        # Create crew
        crew = Crew(
            agents=[self.agent],
            tasks=tasks,
            verbose=True
        )
        
        # Execute
        result = crew.kickoff()
        
        # Parse and structure the results
        output = {
            'narrative_markdown': result.tasks_output[0].output,
            'one_sentence_anchor': result.tasks_output[1].output,
            'faqs': json.loads(result.tasks_output[2].output),
            'small_group_guide_markdown': result.tasks_output[3].output,
            'youth_summary_markdown': result.tasks_output[4].output,
            'kids_summary_markdown': result.tasks_output[5].output,
            'status': 'DRAFT',
            'generated_by': 'VisionWeaverAgent'
        }
        
        return output


def weave_vision_api(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    API endpoint wrapper for vision weaving
    
    Usage:
        POST /api/ai/weave-vision
        {
            "theological_basis": "We are called to love our neighbors...",
            "ministry_strategy": "Focus on local community needs...",
            "scripture_refs": ["Matthew 22:37-39", "Luke 10:25-37"],
            "horizon": "24M",
            "audience": "whole congregation"
        }
    """
    
    try:
        agent = VisionWeaverAgent()
        result = agent.weave_vision(request_data)
        
        return {
            'success': True,
            'vision': result
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


if __name__ == "__main__":
    # Test the agent
    test_context = {
        'theological_basis': 'We are called to love our neighbors as ourselves, following Jesus example of radical hospitality.',
        'ministry_strategy': 'Build relationships with our immediate neighbors, learn their names, understand their needs, and respond with Christ love.',
        'scripture_refs': ['Matthew 22:37-39', 'Luke 10:25-37', 'Romans 12:9-13'],
        'horizon': '24M',
        'audience': 'whole congregation'
    }
    
    agent = VisionWeaverAgent()
    result = agent.weave_vision(test_context)
    
    print("\n=== VISION NARRATIVE ===")
    print(result['narrative_markdown'])
    print("\n=== ONE-SENTENCE ANCHOR ===")
    print(result['one_sentence_anchor'])
    print("\n=== FAQs ===")
    print(json.dumps(result['faqs'], indent=2))
