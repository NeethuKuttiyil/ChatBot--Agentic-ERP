// frontend/src/api/qaService.js
export async function askQuestion(question) {
  const res = await fetch("http://localhost:3000/ask-question", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  return await res.json();
}
