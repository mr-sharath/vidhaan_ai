import json
import httpx
import sys

def main():
    print("Connecting to local Vidhaan AI chat API stream...")
    url = "http://127.0.0.1:8000/api/chat"
    
    # Query an Act that is fully loaded, such as the Arbitration and Conciliation Act
    payload = {
        "messages": [
            {
                "role": "user",
                "content": "What are the grounds for challenging an arbitrator under Section 12 of the Arbitration and Conciliation Act, 1996?"
            }
        ],
        "augmented_mode": True
    }
    
    headers = {
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
    }
    
    try:
        with httpx.stream("POST", url, json=payload, headers=headers, timeout=60.0) as response:
            if response.status_code != 200:
                print(f"Error: API returned status code {response.status_code}")
                return
                
            print("\n--- REAL-TIME STREAMING RESPONSE ---\n")
            
            for line in response.iter_lines():
                if not line.strip():
                    continue
                    
                if line.startswith("event:"):
                    event_type = line.replace("event:", "").strip()
                    print(f"\n[Engine Status] Event: {event_type.upper()}")
                elif line.startswith("data:"):
                    data_str = line.replace("data:", "").strip()
                    try:
                        data = json.loads(data_str)
                        if isinstance(data, list):
                            # It is the sources array
                            print("\n[Cited Sources Anchors]:")
                            for idx, src in enumerate(data, start=1):
                                print(f"  {idx}. Act: {src['act_title']}")
                                print(f"     Section: {src['section_title']}")
                                print(f"     Snippet Match: \"{src['snippets'][0][:100]}...\"")
                            print("\n[Synthesizing Answer Tokens]: ", end="", flush=True)
                        else:
                            # It is a status text or token
                            if "Querying" in data or "Found" in data or "Synthesizing" in data:
                                print(f"  -> {data}")
                            else:
                                print(data, end="", flush=True)
                    except Exception as e:
                        print(data_str, end="", flush=True)
            print("\n\n--- STREAM CONCLUDED ---")
            
    except Exception as err:
        print(f"\nFailed to connect to API stream: {err}")
        print("Ensure the FastAPI server is running on http://127.0.0.1:8000")

if __name__ == "__main__":
    main()
