import requests

url = "http://127.0.0.1:5000/generate_quiz"
headers = {"Content-Type": "application/json"}

# Simulated summary text
data = {
    "summary": "Artificial Intelligence refers to the simulation of human intelligence by machines..."
}

response = requests.post(url, json=data, headers=headers)

print("Status Code:", response.status_code)
print("Response:")
print(response.json())

