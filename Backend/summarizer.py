# summarizer.py - Enhanced version with structured output for frontend
from transformers import pipeline
import re
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from collections import Counter
import json

# Download NLTK data
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('punkt')
    nltk.download('stopwords')

# Load summarization model with MUCH LONGER output parameters
summarizer = pipeline(
    "summarization", 
    model="facebook/bart-large-cnn",
    tokenizer="facebook/bart-large-cnn",
    framework="pt"
)

def generate_summary(text, summary_type="detailed"):
    """
    Generate LONG summaries of different lengths and detail levels
    
    Args:
        text (str): Input text to summarize
        summary_type (str): "brief", "detailed", or "comprehensive"
    
    Returns:
        str: Generated summary with proper formatting for frontend
    """
    
    if not text or len(text.strip()) < 50:
        return "Text too short to summarize effectively."
    
    # Clean and prepare text
    cleaned_text = clean_text_for_summarization(text)
    
    if len(cleaned_text.split()) < 20:
        return cleaned_text  # Return short texts as-is
    
    # Determine summary parameters based on type - MUCH LONGER NOW
    if summary_type == "brief":
        max_length = 300    # Increased from 150
        min_length = 100    # Increased from 50
        compression_ratio = 0.3  # Increased from 0.2
    elif summary_type == "detailed":
        max_length = 600    # Increased from 400
        min_length = 250    # Increased from 150
        compression_ratio = 0.4  # Increased from 0.3
    elif summary_type == "comprehensive":
        max_length = 1200   # Increased from 800
        min_length = 500    # Increased from 300
        compression_ratio = 0.5  # Increased from 0.4
    else:
        # Default to detailed
        max_length = 600
        min_length = 250
        compression_ratio = 0.4
    
    # Calculate dynamic lengths based on input text
    word_count = len(cleaned_text.split())
    dynamic_max = min(max_length, max(min_length, int(word_count * compression_ratio)))
    dynamic_min = min(min_length, max(100, int(dynamic_max * 0.5)))  # Increased minimum
    
    print(f"📝 Generating {summary_type} summary: {word_count} words -> target: {dynamic_min}-{dynamic_max} words")
    
    try:
        # Handle long texts by chunking
        if word_count > 1024:
            summary = generate_chunked_summary(cleaned_text, dynamic_max, dynamic_min, 1024)
        else:
            # Use more aggressive parameters for longer output
            result = summarizer(
                cleaned_text, 
                max_length=dynamic_max, 
                min_length=dynamic_min, 
                do_sample=False,
                length_penalty=3.0,  # Increased from 2.0 - favors longer output
                num_beams=4,
                no_repeat_ngram_size=2,  # Reduced from 3 to allow more repetition
                early_stopping=False  # Don't stop early, generate full length
            )
            summary = result[0]['summary_text']
        
        summary = postprocess_summary(summary)
        print(f"✅ Generated summary: {len(summary.split())} words")
        
        # Format for frontend display
        return format_for_frontend(summary, summary_type)
    
    except Exception as e:
        print(f"❌ Summarization error: {e}")
        # Fallback to extractive summarization
        fallback_summary = generate_extractive_summary(cleaned_text, summary_type)
        return format_for_frontend(fallback_summary, summary_type)

def format_for_frontend(summary, summary_type):
    """
    Format the summary for better display on frontend with proper structure
    """
    if not summary:
        return ""
    
    # Split into paragraphs based on content length and type
    sentences = sent_tokenize(summary)
    
    if len(sentences) <= 3:
        return summary  # Short summaries don't need formatting
    
    # Different formatting based on summary type
    if summary_type == "brief":
        # Brief summaries as a single paragraph
        return summary
    elif summary_type == "detailed":
        # Detailed summaries with 2-3 paragraphs
        return format_detailed_summary(sentences)
    else:  # comprehensive
        # Comprehensive summaries with multiple structured paragraphs
        return format_comprehensive_summary(sentences)

def format_detailed_summary(sentences):
    """
    Format detailed summary with proper paragraph breaks
    """
    if len(sentences) <= 4:
        return " ".join(sentences)
    
    # Split into two paragraphs at a logical point
    split_point = max(3, len(sentences) // 2)
    para1 = " ".join(sentences[:split_point])
    para2 = " ".join(sentences[split_point:])
    
    return f"{para1}\n\n{para2}"

def format_comprehensive_summary(sentences):
    """
    Format comprehensive summary with multiple structured paragraphs
    """
    if len(sentences) <= 6:
        return " ".join(sentences)
    
    # Create 3-4 paragraphs for longer summaries
    paragraphs = []
    sentences_per_para = max(3, len(sentences) // 3)
    
    for i in range(0, len(sentences), sentences_per_para):
        para_sentences = sentences[i:i+sentences_per_para]
        paragraphs.append(" ".join(para_sentences))
    
    return "\n\n".join(paragraphs)

def generate_chunked_summary(text, max_length, min_length, chunk_size):
    """
    Handle long texts by breaking into chunks and summarizing each
    """
    chunks = split_text_into_chunks(text, chunk_size)
    chunk_summaries = []
    
    for i, chunk in enumerate(chunks):
        try:
            # Use larger chunks for better context
            chunk_max = max_length // len(chunks) * 2  # Increased chunk size
            chunk_min = min_length // len(chunks) * 2  # Increased chunk size
            
            result = summarizer(
                chunk, 
                max_length=min(chunk_max, 400),  # Increased from 200
                min_length=min(chunk_min, 150),  # Increased from 50
                do_sample=False,
                length_penalty=2.5,  # Increased for longer output
                early_stopping=False
            )
            chunk_summaries.append(result[0]['summary_text'])
        except Exception as e:
            print(f"Chunk summarization error: {e}")
            # Fallback to first few sentences
            sentences = sent_tokenize(chunk)[:4]  # Increased from 2
            chunk_summaries.append(' '.join(sentences))
    
    # Combine chunk summaries
    combined_summary = ' '.join(chunk_summaries)
    
    # Final summarization pass to ensure coherence
    if len(combined_summary.split()) > max_length * 1.2:
        try:
            final_result = summarizer(
                combined_summary,
                max_length=max_length,
                min_length=min_length,
                do_sample=False,
                length_penalty=3.0,  # Increased for longer output
                early_stopping=False
            )
            return postprocess_summary(final_result[0]['summary_text'])
        except:
            # If final summarization fails, return the combined summary
            return combined_summary[:max_length * 3] + "..."  # Increased buffer
    
    return postprocess_summary(combined_summary)

def generate_extractive_summary(text, summary_type="detailed"):
    """
    Fallback extractive summarization using sentence scoring - LONGER OUTPUT
    """
    sentences = sent_tokenize(text)
    
    if len(sentences) <= 3:
        return text
    
    # Score sentences based on word frequency and position
    word_freq = get_word_frequencies(text)
    sentence_scores = {}
    
    for i, sentence in enumerate(sentences):
        words = re.findall(r'\b[a-zA-Z]{3,}\b', sentence.lower())
        score = 0
        word_count = 0
        
        for word in words:
            if word in word_freq:
                score += word_freq[word]
                word_count += 1
        
        if word_count > 0:
            # Average score with position bonus (earlier sentences get slight boost)
            position_bonus = 1.2 if i < len(sentences) * 0.3 else 0.8
            sentence_scores[sentence] = (score / word_count) * position_bonus
    
    # Select MORE sentences based on summary type
    if summary_type == "brief":
        num_sentences = min(8, max(5, len(sentences) // 3))  # Increased from 3
    elif summary_type == "detailed":
        num_sentences = min(15, max(8, len(sentences) // 2))  # Increased from 6
    else:  # comprehensive
        num_sentences = min(25, max(12, len(sentences) // 1.5))  # Increased from 10
    
    top_sentences = sorted(sentence_scores.items(), key=lambda x: x[1], reverse=True)[:num_sentences]
    
    # Sort selected sentences by original order
    selected_sentences = [sent for sent, score in top_sentences]
    ordered_sentences = []
    
    for sentence in sentences:
        if sentence in selected_sentences:
            ordered_sentences.append(sentence)
    
    summary = ' '.join(ordered_sentences)
    return postprocess_summary(summary)

def generate_extended_summary(text, target_length=1500):  # Increased default
    """
    Generate an extra-long summary using iterative summarization
    """
    if len(text.split()) < 500:
        return generate_summary(text, "comprehensive")
    
    # First pass: comprehensive summary
    first_summary = generate_summary(text, "comprehensive")
    
    # Second pass: expand on the first summary with context
    expanded_text = text + " " + first_summary
    
    try:
        result = summarizer(
            expanded_text,
            max_length=min(target_length, 1200),  # Increased
            min_length=min(600, target_length // 2),  # Increased
            do_sample=False,
            length_penalty=4.0,  # Increased for much longer output
            num_beams=6,
            no_repeat_ngram_size=2,
            early_stopping=False
        )
        summary = result[0]['summary_text']
        return format_for_frontend(postprocess_summary(summary), "comprehensive")
    except Exception as e:
        print(f"Extended summary error: {e}")
        return first_summary

def clean_text_for_summarization(text):
    """Clean and prepare text for better summarization"""
    if not text:
        return ""
    
    # Remove extra whitespace and newlines
    text = re.sub(r'\s+', ' ', text)
    
    # Remove common noise patterns
    noise_patterns = [
        r'\d+\.\d+\.\d+',  # Version numbers
        r'http[s]?://\S+',  # URLs
        r'\[.*?\]',         # Bracketed content
        r'\(.*?\)',         # Parenthetical content (but be careful with these)
    ]
    
    for pattern in noise_patterns:
        text = re.sub(pattern, '', text)
    
    # Remove very short lines (likely formatting artifacts)
    lines = text.split('. ')
    cleaned_lines = [line.strip() for line in lines if len(line.strip()) > 20]
    
    # Rejoin text
    cleaned_text = '. '.join(cleaned_lines)
    
    # Ensure proper spacing after punctuation
    cleaned_text = re.sub(r'([.!?])', r'\1 ', cleaned_text)
    cleaned_text = re.sub(r'\s+', ' ', cleaned_text).strip()
    
    return cleaned_text

def split_text_into_chunks(text, chunk_size):
    """Split text into chunks at sentence boundaries"""
    sentences = sent_tokenize(text)
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        if len(current_chunk.split()) + len(sentence.split()) < chunk_size:
            current_chunk += sentence + " "
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence + " "
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks

def get_word_frequencies(text):
    """Calculate word frequencies for extractive summarization"""
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    
    # Remove common stop words
    stop_words = {
        'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 
        'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 
        'after', 'above', 'below', 'between', 'among', 'this', 'that', 'these', 
        'those', 'his', 'her', 'him', 'she', 'they', 'them', 'their', 'what', 
        'which', 'who', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 
        'each', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own', 
        'same', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now'
    }
    
    filtered_words = [word for word in words if word not in stop_words]
    
    # Count frequencies
    freq = {}
    for word in filtered_words:
        freq[word] = freq.get(word, 0) + 1
    
    # Normalize frequencies
    max_freq = max(freq.values()) if freq else 1
    for word in freq:
        freq[word] = freq[word] / max_freq
    
    return freq

def postprocess_summary(summary):
    """Post-process summary for better readability"""
    if not summary:
        return ""
    
    # Ensure summary starts with a capital letter
    summary = summary.strip()
    if summary and summary[0].islower():
        summary = summary[0].upper() + summary[1:]
    
    # Ensure summary ends with proper punctuation
    if summary and not summary[-1] in '.!?':
        summary += '.'
    
    # Remove redundant introductory phrases
    redundant_phrases = [
        "the article discusses", "the text describes", "this summary explains",
        "in this passage", "the author states that", "this document covers",
        "the paper presents", "the study examines", "the research investigates"
    ]
    
    for phrase in redundant_phrases:
        if summary.lower().startswith(phrase):
            summary = summary[len(phrase):].strip()
            if summary and summary[0].islower():
                summary = summary[0].upper() + summary[1:]
            break
    
    # Remove extra whitespace
    summary = re.sub(r'\s+', ' ', summary)
    
    return summary

def generate_structured_summary(text):
    """
    Generate a structured summary with key points for frontend display
    """
    summary = generate_summary(text, "comprehensive")
    
    # Extract key sentences for structured format
    sentences = sent_tokenize(summary)
    
    if len(sentences) <= 2:
        return {
            "main_summary": summary,
            "key_points": sentences,
            "full_summary": summary
        }
    
    # Main summary is first 1-2 sentences
    main_part = '. '.join(sentences[:2]) + '.'
    
    # Key points are the remaining important sentences
    key_points = []
    for sentence in sentences[2:]:
        # Filter out very short or incomplete sentences
        if len(sentence.split()) > 5 and not sentence.endswith('...'):
            key_points.append(sentence)
    
    return {
        "main_summary": main_part,
        "key_points": key_points[:8],  # Increased from 5
        "full_summary": format_for_frontend(summary, "comprehensive")
    }

def generate_detailed_summary(text):
    """
    Drop-in replacement for detailed summaries
    Returns a detailed summary with better quality and formatting
    """
    return generate_summary(text, summary_type="detailed")

def generate_long_structured_summary(text, structure_level="detailed"):
    """
    Generate a comprehensive, structured summary with multiple sections
    """
    if not text or len(text.strip()) < 100:
        return {"error": "Text too short for structured summary"}
    
    # Generate comprehensive summary first (LONGER)
    comprehensive_summary = generate_summary(text, "comprehensive")
    
    # Extract key information for structure
    key_topics = extract_key_topics(text)  # Use original text for better topics
    key_entities = extract_named_entities(text)  # Use original text
    main_points = extract_main_points(comprehensive_summary)
    
    # Build structured summary
    structured_summary = {
        "overview": generate_overview_section(comprehensive_summary),
        "key_findings": generate_key_findings(main_points),
        "topics_covered": key_topics[:10],  # Increased from 8
        "main_entities": key_entities[:8],  # Increased from 6
        "detailed_analysis": generate_detailed_analysis(comprehensive_summary, structure_level),
        "conclusion": generate_conclusion_section(comprehensive_summary),
        "full_summary": format_for_frontend(comprehensive_summary, "comprehensive")
    }
    
    return structured_summary

def extract_key_topics(text, num_topics=12):  # Increased from 10
    """
    Extract main topics from text using TF-IDF like approach
    """
    words = word_tokenize(text.lower())
    
    # Remove stopwords and short words
    stop_words = set(stopwords.words('english'))
    filtered_words = [word for word in words if word.isalpha() and word not in stop_words and len(word) > 2]
    
    # Get word frequencies
    word_freq = Counter(filtered_words)
    
    # Get most common topics
    topics = [word for word, count in word_freq.most_common(num_topics)]
    
    return topics

def extract_named_entities(text):
    """
    Simple named entity extraction (can be enhanced with proper NER)
    """
    # This is a simple implementation - consider using spaCy for better NER
    sentences = sent_tokenize(text)
    entities = set()
    
    # Look for capitalized phrases that might be entities
    for sentence in sentences:
        words = word_tokenize(sentence)
        for i, word in enumerate(words):
            if (word.istitle() and len(word) > 2 and 
                word.lower() not in stopwords.words('english')):
                # Check if it's part of a multi-word entity
                if (i > 0 and words[i-1].istitle() and 
                    words[i-1].lower() not in stopwords.words('english')):
                    entity = f"{words[i-1]} {word}"
                    entities.add(entity)
                else:
                    entities.add(word)
    
    return list(entities)[:12]  # Increased from 10

def extract_main_points(summary_text, num_points=8):  # Increased from 5
    """
    Extract MORE main points from a summary
    """
    sentences = sent_tokenize(summary_text)
    
    if len(sentences) <= num_points:
        return sentences
    
    # Score sentences by length and content
    scored_sentences = []
    for sentence in sentences:
        score = len(sentence.split()) * 2  # Double weight for length
        
        # Bonus for sentences that seem important
        important_keywords = ['important', 'key', 'main', 'primary', 'critical', 
                             'conclusion', 'summary', 'finding', 'result']
        if any(keyword in sentence.lower() for keyword in important_keywords):
            score *= 2.0
        
        scored_sentences.append((sentence, score))
    
    # Sort by score and take top sentences
    scored_sentences.sort(key=lambda x: x[1], reverse=True)
    return [sentence for sentence, score in scored_sentences[:num_points]]

def generate_overview_section(summary_text):
    """
    Generate overview section from summary
    """
    sentences = sent_tokenize(summary_text)
    if len(sentences) >= 3:  # Increased from 2
        return '. '.join(sentences[:3]) + '.'
    return summary_text

def generate_key_findings(main_points):
    """
    Format main points as key findings with bullet points
    """
    return [f"• {point}" if not point.startswith('•') else point for point in main_points]

def generate_detailed_analysis(summary_text, structure_level):
    """
    Generate detailed analysis section with proper formatting
    """
    sentences = sent_tokenize(summary_text)
    
    if structure_level == "basic":
        analysis_sentences = sentences[3:6] if len(sentences) > 6 else sentences[3:]
    elif structure_level == "detailed":
        analysis_sentences = sentences[3:8] if len(sentences) > 8 else sentences[3:]
    else:  # comprehensive
        analysis_sentences = sentences[3:12] if len(sentences) > 12 else sentences[3:]
    
    # Format as paragraphs
    return format_for_frontend(" ".join(analysis_sentences), "detailed")

def generate_conclusion_section(summary_text):
    """
    Extract or generate conclusion from summary with proper formatting
    """
    sentences = sent_tokenize(summary_text)
    
    if len(sentences) >= 4:  # Increased from 3
        # Try to find concluding sentences (often the last ones)
        conclusion_candidates = sentences[-3:] if len(sentences) > 4 else sentences[-2:]  # Increased
        
        # Look for conclusion indicators
        conclusion_keywords = ['conclusion', 'summary', 'finally', 'overall', 'in summary', 
                              'therefore', 'thus', 'consequently', 'in conclusion']
        for sentence in reversed(sentences):
            if any(keyword in sentence.lower() for keyword in conclusion_keywords):
                return sentence
        
        return '. '.join(conclusion_candidates) + '.'
    
    return sentences[-1] if sentences else ""

def generate_multi_level_summary(text):
    """
    Generate summaries at multiple levels of detail with proper formatting
    """
    return {
        "executive_summary": generate_summary(text, "brief"),
        "detailed_summary": generate_summary(text, "detailed"),
        "comprehensive_summary": generate_summary(text, "comprehensive"),
        "extended_summary": generate_extended_summary(text),
        "structured_summary": generate_long_structured_summary(text, "detailed")
    }

# Additional utility function for your upload endpoint
def should_regenerate_summary(file_doc, new_text):
    """
    Determine if a summary should be regenerated based on content changes
    """
    if not file_doc.get('summary'):
        return True
    
    old_text = file_doc.get('text', '')
    if not old_text:
        return True
    
    # If text length changed significantly, regenerate
    length_diff = abs(len(new_text) - len(old_text)) / max(len(new_text), 1)
    if length_diff > 0.3:  # 30% change
        return True
    
    # TODO: Add more sophisticated content comparison
    return False