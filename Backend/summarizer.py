from transformers import pipeline #summaring

# Load once
summarizer = pipeline("summarization")

def generate_summary(text):
    result = summarizer(text, max_length=150, min_length=30, do_sample=False)
    return result[0]['summary_text']
