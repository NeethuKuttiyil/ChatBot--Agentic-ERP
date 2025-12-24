// frontend/src/api/qaService.js
export async function askQuestion(question) {
  const res = await fetch(import.meta.env.VITE_API_URL + "/ask-question", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  return await res.json();
}
