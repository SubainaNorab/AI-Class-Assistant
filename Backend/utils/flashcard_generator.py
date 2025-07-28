from openai import OpenAI
import os
import json
import re
from typing import List, Dict, Any

def build_flashcard_prompt(content: str) -> str:
    """Build a prompt for generating flashcards from content"""
    prompt = f"""
Generate exactly 5 high-quality flashcards from the following content.

Content: {content}

Instructions:
1. Create exactly 5 flashcards covering the most important concepts
2. Questions should be clear, concise, and test key understanding
3. Answers should be comprehensive but not too long (2-3 sentences max)
4. Focus on definitions, key concepts, processes, and important facts
5. Make questions that would help a student learn and remember the material

Return ONLY a valid JSON array in this exact format:
[
  {{
    "question": "What is the main concept?",
    "answer": "The main concept is..."
  }},
  {{
    "question": "Define key term X?",
    "answer": "Key term X is defined as..."
  }}
]

Do not include any other text, explanations, or formatting outside the JSON array.
"""
    return prompt

def call_openai_for_flashcards(prompt: str) -> Dict[str, Any]:
    """Call OpenAI API to generate flashcards with detailed error handling"""
    try:
        # Get API key from environment
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return {
                "success": False, 
                "error_type": "no_api_key",
                "error_message": "OpenAI API key not found in environment variables",
                "user_message": "🔑 OpenAI API key is missing. Please set your API key to use AI-powered flashcard generation."
            }
        
        print("🤖 Attempting to generate flashcards using OpenAI...")
        
        # Create OpenAI client
        client = OpenAI(api_key=api_key)
        
        # Make API call
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert educational content creator who generates high-quality flashcards. Respond only with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=800,
            temperature=0.3
        )
        
        # Extract content from response
        content = response.choices[0].message.content.strip()
        
        # Clean up the response (remove any markdown formatting)
        if content.startswith('```json'):
            content = content.replace('```json', '').replace('```', '').strip()
        elif content.startswith('```'):
            content = content.replace('```', '').strip()
        
        # Parse JSON response
        try:
            flashcards = json.loads(content)
            print("✅ OpenAI successfully generated flashcards!")
            return {
                "success": True,
                "flashcards": flashcards,
                "source": "openai",
                "user_message": "✨ Flashcards generated using OpenAI GPT-3.5"
            }
        except json.JSONDecodeError as e:
            print(f"❌ JSON parsing error from OpenAI response: {e}")
            return {
                "success": False,
                "error_type": "json_parse_error",
                "error_message": f"OpenAI returned invalid JSON: {str(e)}",
                "user_message": "🤖 OpenAI responded but with invalid format. Using content-based generation instead.",
                "raw_response": content[:200] + "..." if len(content) > 200 else content
            }
            
    except Exception as e:
        error_str = str(e).lower()
        print(f"❌ OpenAI API error: {e}")
        
        # Categorize different types of errors for better user feedback
        if "quota" in error_str or "billing" in error_str or "429" in error_str:
            return {
                "success": False,
                "error_type": "quota_exceeded",
                "error_message": str(e),
                "user_message": "💳 OpenAI quota exceeded. Please check your billing settings at platform.openai.com/billing"
            }
        elif "rate" in error_str or "too many requests" in error_str:
            return {
                "success": False,
                "error_type": "rate_limit",
                "error_message": str(e),
                "user_message": "⏱️ OpenAI rate limit reached. Please wait a moment before trying again."
            }
        elif "authentication" in error_str or "401" in error_str:
            return {
                "success": False,
                "error_type": "auth_error",
                "error_message": str(e),
                "user_message": "🔐 OpenAI authentication failed. Please check your API key."
            }
        elif "network" in error_str or "connection" in error_str:
            return {
                "success": False,
                "error_type": "network_error",
                "error_message": str(e),
                "user_message": "🌐 Network connection issue. Please check your internet connection."
            }
        else:
            return {
                "success": False,
                "error_type": "unknown_error",
                "error_message": str(e),
                "user_message": f"🤖 OpenAI error: {str(e)[:100]}... Using content-based generation instead."
            }

def generate_content_based_flashcards(content: str) -> Dict[str, Any]:
    """Generate flashcards using intelligent content analysis - GUARANTEED to work"""
    
    if not content or len(content.strip()) < 10:
        return {
            "success": False,
            "error": "Content too short to generate meaningful flashcards"
        }
    
    print("🧠 Generating flashcards using content analysis...")
    
    # Split content into sentences
    sentences = re.split(r'[.!?]+', content)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 5]
    
    if not sentences:
        sentences = [content.strip()]  # Fallback: use entire content as one sentence
    
    flashcards = []
    
    # Method 1: Definition-based questions (most reliable)
    definition_keywords = ['is', 'are', 'means', 'refers to', 'defined as', 'known as', 'called']
    
    for sentence in sentences[:4]:  # Check first 4 sentences
        sentence_lower = sentence.lower()
        for keyword in definition_keywords:
            if f' {keyword} ' in sentence_lower:
                try:
                    parts = sentence.split(f' {keyword} ', 1)
                    if len(parts) == 2:
                        subject = parts[0].strip()
                        definition = parts[1].strip()
                        
                        # Clean up subject and definition
                        if len(subject) > 2 and len(definition) > 5:
                            flashcards.append({
                                "question": f"What {keyword} {subject}?",
                                "answer": f"{subject} {keyword} {definition}."
                            })
                            break
                except Exception as e:
                    print(f"Error processing definition: {e}")
                    continue
    
    # Method 2: Extract key terms and create questions
    key_terms = extract_key_terms_robust(content)
    for term in key_terms[:3]:
        if len(flashcards) >= 5:
            break
        
        # Find sentence that mentions this term
        best_sentence = ""
        for sentence in sentences:
            if term.lower() in sentence.lower() and len(sentence) > 20:
                best_sentence = sentence.strip()
                break
        
        if best_sentence:
            flashcards.append({
                "question": f"What can you tell me about {term}?",
                "answer": best_sentence + "."
            })
    
    # Method 3: Create questions from sentence structure
    for sentence in sentences[:3]:
        if len(flashcards) >= 5:
            break
        
        if len(sentence) > 30:  # Only use substantial sentences
            words = sentence.split()
            if len(words) > 5:
                # Create a "What is..." question from the first part
                first_part = ' '.join(words[:4])
                flashcards.append({
                    "question": f"What is mentioned about {first_part}?",
                    "answer": sentence.strip() + "."
                })
    
    # Method 4: Fill remaining slots with guaranteed questions
    generic_questions = [
        {
            "question": "What is the main topic discussed in this content?",
            "answer": create_topic_answer(content, sentences)
        },
        {
            "question": "What are the key points mentioned in the content?",
            "answer": create_key_points_answer(sentences)
        },
        {
            "question": "What examples or applications are discussed?",
            "answer": create_examples_answer(content, sentences)
        },
        {
            "question": "What should someone learn from this content?",
            "answer": create_learning_answer(sentences)
        },
        {
            "question": "How would you summarize this information?",
            "answer": create_summary_answer(sentences)
        }
    ]
    
    # Add generic questions to fill up to 5 flashcards
    for question in generic_questions:
        if len(flashcards) >= 5:
            break
        flashcards.append(question)
    
    # Ensure we have exactly 5 flashcards
    while len(flashcards) < 5:
        flashcards.append({
            "question": f"What is important to remember from section {len(flashcards) + 1}?",
            "answer": sentences[len(flashcards) % len(sentences)] if sentences else "Review the key concepts in the content."
        })
    
    # Limit to exactly 5 flashcards
    flashcards = flashcards[:5]
    
    # Validate all flashcards have content
    for i, card in enumerate(flashcards):
        if not card.get('question') or not card.get('answer'):
            flashcards[i] = {
                "question": f"What is the key concept #{i+1} in this content?",
                "answer": sentences[0] if sentences else "Key concepts are covered in the provided content."
            }
    
    print(f"✅ Generated {len(flashcards)} content-based flashcards")
    
    return {
        "success": True,
        "flashcards": flashcards,
        "source": "content_analysis",
        "user_message": "🧠 Flashcards generated using intelligent content analysis"
    }

def extract_key_terms_robust(content: str) -> List[str]:
    """Extract key terms more robustly"""
    # Look for capitalized words (likely to be important terms)
    capitalized_words = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', content)
    
    # Look for technical terms
    content_lower = content.lower()
    technical_terms = []
    
    common_important_terms = [
        'machine learning', 'artificial intelligence', 'algorithm', 'programming',
        'data', 'system', 'process', 'method', 'technique', 'approach',
        'concept', 'principle', 'theory', 'model', 'framework', 'structure'
    ]
    
    for term in common_important_terms:
        if term in content_lower:
            technical_terms.append(term.title())
    
    # Combine and clean up
    all_terms = capitalized_words + technical_terms
    unique_terms = list(set(all_terms))
    
    # Filter out very short terms
    filtered_terms = [term for term in unique_terms if len(term) > 2]
    
    return filtered_terms[:8]  # Return top 8 terms

def create_topic_answer(content: str, sentences: List[str]) -> str:
    """Create a topic answer based on content analysis"""
    content_lower = content.lower()
    
    # Check for common topics
    if 'machine learning' in content_lower or 'ai' in content_lower:
        return "The content discusses artificial intelligence and machine learning concepts, applications, and techniques."
    elif 'programming' in content_lower or 'code' in content_lower:
        return "The content covers programming concepts, techniques, and best practices."
    elif 'data' in content_lower:
        return "The content focuses on data science, analysis, and data-related methodologies."
    else:
        # Use first sentence or create generic answer
        if sentences and len(sentences[0]) > 10:
            return f"The main topic is: {sentences[0].strip()}."
        else:
            return "The content covers important concepts and their practical applications."

def create_key_points_answer(sentences: List[str]) -> str:
    """Create key points answer from sentences"""
    if not sentences:
        return "Key points include fundamental concepts and their applications."
    
    # Take first 2-3 sentences as key points
    key_sentences = sentences[:3]
    if len(key_sentences) == 1:
        return f"Key point: {key_sentences[0].strip()}."
    else:
        return f"Key points include: {key_sentences[0].strip()}, and {key_sentences[1].strip() if len(key_sentences) > 1 else 'related concepts'}."

def create_examples_answer(content: str, sentences: List[str]) -> str:
    """Create examples answer"""
    example_indicators = ['example', 'such as', 'like', 'including', 'for instance', 'used in']
    
    for sentence in sentences:
        sentence_lower = sentence.lower()
        for indicator in example_indicators:
            if indicator in sentence_lower:
                return sentence.strip() + "."
    
    return "The content includes various practical examples and real-world applications of the concepts discussed."

def create_learning_answer(sentences: List[str]) -> str:
    """Create learning outcome answer"""
    if sentences and len(sentences) > 0:
        return f"Students should understand: {sentences[0].strip()}."
    return "Students should focus on understanding the main concepts and their practical applications."

def create_summary_answer(sentences: List[str]) -> str:
    """Create summary answer"""
    if not sentences:
        return "The content provides comprehensive coverage of important topics and concepts."
    
    if len(sentences) == 1:
        return sentences[0].strip() + "."
    else:
        return f"In summary: {sentences[0].strip()}, with additional details about {' '.join(sentences[1].split()[:5])}..."

def extract_key_concepts(content: str) -> List[str]:
    """Extract key concepts from content"""
    # Look for capitalized terms, technical words, and important phrases
    words = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', content)
    
    # Also look for important technical terms
    technical_terms = []
    content_lower = content.lower()
    important_terms = [
        'machine learning', 'artificial intelligence', 'algorithm', 'data science',
        'neural network', 'programming', 'database', 'software', 'system',
        'method', 'process', 'technique', 'approach', 'model', 'framework'
    ]
    
    for term in important_terms:
        if term in content_lower:
            technical_terms.append(term.title())
    
    # Combine and remove duplicates
    all_concepts = list(set(words + technical_terms))
    return all_concepts[:5]

def find_best_explanation_sentence(concept: str, sentences: List[str]) -> str:
    """Find the sentence that best explains a concept"""
    concept_lower = concept.lower()
    best_sentence = ""
    max_relevance = 0
    
    for sentence in sentences:
        sentence_lower = sentence.lower()
        if concept_lower in sentence_lower:
            # Score based on presence of explanation indicators
            relevance = 0
            explanation_indicators = ['is', 'are', 'means', 'involves', 'includes', 'refers to']
            for indicator in explanation_indicators:
                if indicator in sentence_lower:
                    relevance += 1
            
            # Prefer longer, more descriptive sentences
            relevance += len(sentence) / 100
            
            if relevance > max_relevance:
                max_relevance = relevance
                best_sentence = sentence
    
    return best_sentence

def extract_list_items(content: str) -> List[Dict[str, str]]:
    """Extract items from numbered lists or bullet points"""
    items = []
    
    # Look for numbered lists (1. 2. 3. etc.)
    numbered_pattern = r'(\d+[\.\)]\s*)([^\.]+)'
    matches = re.findall(numbered_pattern, content)
    
    for match in matches[:3]:
        item_content = match[1].strip()
        if len(item_content) > 10:
            # Extract the main topic (first few words)
            words = item_content.split()[:3]
            topic = ' '.join(words)
            items.append({
                'topic': topic,
                'content': item_content + "."
            })
    
    # Look for bullet points
    bullet_pattern = r'[•\-\*]\s*([^•\-\*\n]+)'
    bullet_matches = re.findall(bullet_pattern, content)
    
    for match in bullet_matches[:2]:
        item_content = match.strip()
        if len(item_content) > 10:
            words = item_content.split()[:3]
            topic = ' '.join(words)
            items.append({
                'topic': topic,
                'content': item_content + "."
            })
    
    return items

def extract_main_topic(content: str) -> str:
    """Extract the main topic from content"""
    content_lower = content.lower()
    
    # Common topic indicators
    topic_mapping = {
        'machine learning': 'machine learning concepts and applications',
        'artificial intelligence': 'artificial intelligence and its implementations',
        'programming': 'programming concepts and techniques',
        'python': 'Python programming language features',
        'data science': 'data science methodologies and tools',
        'algorithm': 'algorithms and computational methods',
        'database': 'database management and design',
        'web development': 'web development technologies and practices',
        'software': 'software development and engineering'
    }
    
    for topic, description in topic_mapping.items():
        if topic in content_lower:
            return description
    
    # Fallback: use first meaningful words
    words = content.split()[:10]
    meaningful_words = [w for w in words if len(w) > 3]
    return ' '.join(meaningful_words[:5]) + "..."

def extract_applications_and_examples(content: str) -> str:
    """Extract applications and examples from content"""
    content_lower = content.lower()
    
    # Look for example indicators
    example_indicators = [
        'example', 'such as', 'like', 'including', 'for instance',
        'used in', 'applied to', 'applications include'
    ]
    
    for indicator in example_indicators:
        if indicator in content_lower:
            sentences = content.split('.')
            for sentence in sentences:
                if indicator in sentence.lower():
                    return sentence.strip() + "."
    
    return "The content includes various practical applications and real-world examples."

def extract_processes_and_methods(content: str) -> str:
    """Extract processes and methods from content"""
    process_keywords = ['process', 'method', 'approach', 'technique', 'procedure', 'algorithm', 'steps']
    
    sentences = content.split('.')
    for sentence in sentences:
        sentence_lower = sentence.lower()
        for keyword in process_keywords:
            if keyword in sentence_lower:
                return sentence.strip() + "."
    
    return "The content describes various methods and processes relevant to the topic."

def validate_flashcards(flashcards_data: Dict[str, Any]) -> bool:
    """Validate the structure of generated flashcards"""
    try:
        if not isinstance(flashcards_data, dict):
            return False
        
        if "flashcards" not in flashcards_data:
            return False
        
        flashcards = flashcards_data["flashcards"]
        if not isinstance(flashcards, list) or len(flashcards) == 0:
            return False
        
        for flashcard in flashcards:
            if not isinstance(flashcard, dict):
                return False
            if "question" not in flashcard or "answer" not in flashcard:
                return False
            if not isinstance(flashcard["question"], str) or not isinstance(flashcard["answer"], str):
                return False
            if len(flashcard["question"].strip()) == 0 or len(flashcard["answer"].strip()) == 0:
                return False
        
        return True
        
    except Exception:
        return False

def generate_flashcards(content: str) -> Dict[str, Any]:
    """Main function with intelligent OpenAI-first, content-analysis fallback approach"""
    if not content or len(content.strip()) < 10:
        return {
            "success": False,
            "error": "Content too short to generate meaningful flashcards"
        }
    
    print("🚀 Starting flashcard generation...")
    
    # Step 1: Try OpenAI first (highest priority)
    prompt = build_flashcard_prompt(content)
    openai_result = call_openai_for_flashcards(prompt)
    
    if openai_result.get("success", False):
        # OpenAI succeeded - validate and return
        if validate_flashcards(openai_result):
            print("✅ OpenAI generation successful!")
            return openai_result
        else:
            print("⚠️ OpenAI returned invalid flashcard format, falling back...")
    else:
        print(f"❌ OpenAI failed: {openai_result.get('user_message', 'Unknown error')}")
    
    # Step 2: OpenAI failed - ALWAYS use content-based generation
    print("🔄 Using content-based generation...")
    content_result = generate_content_based_flashcards(content)
    
    if content_result.get("success", False):
        print("✅ Content-based generation successful!")
        
        # Add OpenAI error information to the response
        openai_error_msg = openai_result.get("user_message", "OpenAI service unavailable")
        content_result["ai_status"] = {
            "ai_available": False,
            "ai_error": openai_error_msg,
            "fallback_used": True
        }
        content_result["note"] = f"{openai_error_msg} | Content-based flashcards generated successfully"
        
        return content_result
    else:
        print("❌ Content-based generation also failed!")
        
        # Step 3: Both failed - return detailed error
        return {
            "success": False,
            "error": "Failed to generate flashcards using both AI and content analysis",
            "details": {
                "openai_error": openai_result.get("user_message", "OpenAI unavailable"),
                "content_error": content_result.get("error", "Content analysis failed")
            },
            "ai_status": {
                "ai_available": False,
                "ai_error": openai_result.get("user_message", "OpenAI unavailable"),
                "content_analysis_failed": True
            }
        }