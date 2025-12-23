// src/pages/ChatPage.jsx
import React, { useState } from "react";
import axios from "axios";
import { Box, Button, TextField, Typography, Paper, Stack } from "@mui/material";
import MarkdownRenderer from "../components/MarkdownRenderer";

const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);

  const handleSend = async () => {
    if (!input.trim() && files.length === 0) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const formData = new FormData();
      formData.append("message", input);
      files.forEach((file) => formData.append("files", file));

      const response = await axios.post("http://localhost:7095/api/chat", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const assistantMessage = { role: "assistant", content: response.data };
      setMessages((prev) => [...prev, assistantMessage]);
      setInput("");
      setFiles([]);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Excel File Chat Assistant
      </Typography>

      <Paper elevation={3} sx={{ p: 2, mb: 2, maxHeight: 400, overflow: "auto" }}>
        {messages.map((msg, idx) => (
          <Box key={idx} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color={msg.role === "user" ? "primary" : "secondary"}>
              {msg.role === "user" ? "You" : "Assistant"}
            </Typography>
            <MarkdownRenderer content={msg.content} />
          </Box>
        ))}
      </Paper>

      <Stack spacing={2} direction="row" sx={{ mb: 2 }}>
        <TextField
          fullWidth
          label="Ask a question"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button variant="contained" onClick={handleSend}>
          Send
        </Button>
      </Stack>

      <Button variant="outlined" component="label">
        Upload Excel Files
        <input type="file" hidden multiple onChange={handleFileChange} />
      </Button>

      {files.length > 0 && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          Selected files: {files.map((f) => f.name).join(", ")}
        </Typography>
      )}
    </Box>
  );
};

export default ChatPage;
