// frontend/src/App.jsx
import React, { useState, useRef, useEffect } from "react";
import {
    AppBar,
    Toolbar,
    Typography,
    Box,
    Paper,
    Drawer,
    TextField,
    IconButton,
    Button,
    Container,
    Stack,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    CssBaseline,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import SendIcon from "@mui/icons-material/Send";
// import UploadFileIcon from "@mui/icons-material/UploadFile"; // No longer directly used for button, replaced by CloudUploadIcon
import AnalyzeIcon from "@mui/icons-material/Search";
import ImageIcon from "@mui/icons-material/Image";
import GetAppIcon from '@mui/icons-material/GetApp';
import InsertChartIcon from '@mui/icons-material/InsertChart';
import CloudUploadIcon from '@mui/icons-material/CloudUpload'; // Icon for general file upload
import axios from "axios";
import MarkdownRenderer from "./components/MarkdownRenderer"; // Ensure this component exists
import ErrorBoundary from "./components/ErrorBoundary"; // Ensure this component exists
import ChartDisplay from "./components/ChartDisplay"; // Ensure this component exists
import { toast, ToastContainer } from 'react-toastify'; // For notifications
import 'react-toastify/dist/ReactToastify.css'; // Toastify CSS

const drawerWidth = 240;

// Define a custom theme
const theme = createTheme({
    palette: {
        primary: {
            main: '#0F4C75', // Dark Blue
        },
        secondary: {
            main: '#3282B8', // Medium Blue
        },
        background: {
            default: '#FFFFFF', // White background
            paper: '#FFFFFF', // White for Paper components
        },
        text: {
            primary: '#1B262C', // Dark text
            secondary: '#424242', // Grayish text for less emphasis
        },
    },
    typography: {
        fontFamily: 'Roboto, Arial, sans-serif',
        h4: {
            fontWeight: 600,
            color: '#0F4C75',
            marginBottom: '1rem',
        },
        h6: {
            fontWeight: 500,
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    textTransform: 'none',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 5,
                        backgroundColor: '#F5F5F5',
                    },
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#1B262C',
                    color: '#E3F2FD',
                },
            },
        },
        MuiListItemText: {
            styleOverrides: {
                primary: {
                    color: '#E3F2FD',
                },
            },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    '&:hover': {
                        backgroundColor: '#3282B8',
                    },
                },
            },
        },
    },
});

// ChatMessage component: Displays individual messages, including images and charts, with download options
const ChatMessage = ({ sender, message, imageUrl, chartData, chartType, chartExplanation }) => {
    const chartComponentRef = useRef(null);

    const handleDownloadText = (content, fileName) => {
        if (!content) return;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || 'AI_Insight.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadChart = async (fileName) => {
        if (chartComponentRef.current && chartComponentRef.current.toPng) {
            const dataUrl = await chartComponentRef.current.toPng();
            if (dataUrl) {
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = fileName || 'chart.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } else {
                console.error("Failed to get chart image data.");
            }
        }
    };

    return (
        <Box
            sx={{
                alignSelf: sender === "user" ? "flex-end" : "flex-start",
                bgcolor: sender === "user" ? theme.palette.primary.main : theme.palette.background.paper,
                color: sender === "user" ? "#fff" : theme.palette.text.primary,
                px: 3,
                py: 2,
                borderRadius: 3,
                maxWidth: "85%", // This ensures message bubbles don't stretch too wide
                my: 1,
                boxShadow: 3,
                fontSize: "0.95rem",
                lineHeight: 1.6,
                position: 'relative',
                pr: sender === "agent" ? (chartData ? 12 : 6) : 3, // Adjust padding for download icons
            }}
        >
            {message && <MarkdownRenderer content={message} />}
            {imageUrl && (
                <Box sx={{ mt: 1, maxWidth: '100%' }}>
                    <img src={imageUrl} alt="Generated" style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }} />
                </Box>
            )}
            {chartData && chartType && (
                <Box sx={{ mt: 1, width: '100%', height: '400px' }}>
                    <ChartDisplay ref={chartComponentRef} chartType={chartType} chartData={chartData} explanation={chartExplanation} />
                </Box>
            )}

            {sender === "agent" && (message || chartData) && (
                <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        bgcolor: 'rgba(255,255,255,0.7)',
                        borderRadius: 2,
                        p: 0.5,
                        boxShadow: 1
                    }}
                >
                    {message && (
                        <IconButton
                            size="small"
                            onClick={() => handleDownloadText(message, 'AI_Insight.txt')}
                            aria-label="download text"
                            sx={{ color: (theme) => theme.palette.text.secondary }}
                        >
                            <GetAppIcon fontSize="small" />
                        </IconButton>
                    )}

                    {chartData && chartType && (
                        <IconButton
                            size="small"
                            onClick={() => handleDownloadChart('chart.png')}
                            aria-label="download chart image"
                            sx={{ color: (theme) => theme.palette.text.secondary }}
                        >
                            <InsertChartIcon fontSize="small" />
                        </IconButton>
                    )}
                </Stack>
            )}
        </Box>
    );
};

function App() {
    const [messages, setMessages] = useState([
        { sender: "agent", message: "👋 Hello! I’m your AI assistant. How can I assist you today?" },
    ]);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef(null);
    const [loading, setLoading] = useState(false);

    const [asisImageFile, setAsisImageFile] = useState(null);

    const [uploadedExcelSummary, setUploadedExcelSummary] = useState("");
    const [uploadedAnalysisResults, setUploadedAnalysisResults] = useState([]);
    const [uploadedDocumentNames, setUploadedDocumentNames] = useState([]); // To store names of uploaded PDFs/DOCX/TXT

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Helper to update agent messages dynamically
    const updateAgentMessage = (reply, imageUrl = null, chartData = null, chartType = null, chartExplanation = null) => {
        setMessages((prev) => {
            // Find the last "Thinking..." message and update it, or add a new one
            const newMessages = [...prev];
            const lastAgentThinkingIndex = newMessages.findIndex(
                (msg, index) => msg.sender === "agent" && msg.message === "Thinking..." && index === newMessages.length - 1
            );

            if (lastAgentThinkingIndex !== -1) {
                newMessages[lastAgentThinkingIndex] = {
                    sender: "agent",
                    message: reply,
                    imageUrl,
                    chartData,
                    chartType,
                    chartExplanation,
                };
            } else {
                newMessages.push({
                    sender: "agent",
                    message: reply,
                    imageUrl,
                    chartData,
                    chartType,
                    chartExplanation,
                });
            }
            return newMessages;
        });
    };

    const handleSend = async () => {
        // If no text input and no AS-IS image is set, do nothing.
        // Analyze Image is handled by its own button, so no need to check here.
        if (!input.trim() && !asisImageFile) {
            toast.info("Please type a message or upload an AS-IS image to proceed.");
            return;
        }

        const userMessage = input;
        setMessages((prev) => [...prev, { sender: "user", message: userMessage }]);
        setInput(""); // Clear input immediately
        setLoading(true);

        updateAgentMessage("Thinking..."); // Add initial thinking message

        try {
            let response;
            const lowerCaseMessage = userMessage.toLowerCase();

            // --- AS-IS to TO-BE Transformation ---
            const tobeKeywords = ["to-be", "convert to", "transform to", "process to"];
            const isToBeRequest = tobeKeywords.some(keyword => lowerCaseMessage.includes(keyword));

            if (isToBeRequest && asisImageFile) {
                updateAgentMessage("Generating TO-BE process description...");

                const formData = new FormData();
                formData.append("prompt", userMessage);
                formData.append("image", asisImageFile);

                response = await axios.post(import.meta.env.VITE_API_URL + "/api/process-image", formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                const data = response.data;

                updateAgentMessage(data.reply || data.error || "TO-BE description generated, but no specific text was returned.");
                setAsisImageFile(null); // Clear AS-IS image after use
                return; // Exit after handling this specific request
            }

            // --- Chart Generation from Excel ---
            const chartKeywords = ["chart", "graph", "plot", "visualize", "show me chart", "diagram of data"];
            const isChartRequest = chartKeywords.some(keyword => lowerCaseMessage.includes(keyword));

            if (isChartRequest) {
                updateAgentMessage("Generating chart data...");

                response = await axios.post(import.meta.env.VITE_API_URL + "/api/chart", { message: userMessage });
                const responseData = response.data;

                if (responseData.chartType && responseData.chartData) {
                    updateAgentMessage(responseData.explanation, null, responseData.chartData, responseData.chartType, responseData.explanation);
                } else {
                    updateAgentMessage(responseData.reply || responseData.error || "Could not generate chart. Please ensure Excel data is uploaded and your request is clear.");
                }
                return; // Exit after handling this specific request
            }

            // --- Document Analysis Logic (PDF, DOCX, TXT) ---
            if (lowerCaseMessage.startsWith('analyze document') ||
                lowerCaseMessage.startsWith('summarize') ||
                lowerCaseMessage.startsWith('extract entities') ||
                lowerCaseMessage.includes('answer question about')) {

                let targetDocumentName = null;

                // Attempt to extract document name from message (e.g., "analyze document my_report.pdf")
                const docNameRegex = /([a-zA-Z0-9_.-]+\.(?:pdf|docx|txt))/i;
                const match = userMessage.match(docNameRegex);
                if (match && match[1]) {
                    targetDocumentName = match[1];
                } else if (uploadedDocumentNames.length > 0) {
                    // If no specific name in the message, try to use the last uploaded document
                    targetDocumentName = uploadedDocumentNames[uploadedDocumentNames.length - 1];
                }

                if (!targetDocumentName) {
                    updateAgentMessage("Please specify which document to analyze (e.g., 'analyze document MyReport.pdf') or upload one first.");
                    return; // Exit if no target document
                }

                // Verify the document exists in our frontend's known uploaded list
                if (!uploadedDocumentNames.includes(targetDocumentName)) {
                    updateAgentMessage(`Document '${targetDocumentName}' was not found among the recently uploaded documents. Please upload it first.`);
                    return; // Exit if document not found in known list
                }

                let analysisType = 'general';
                let question = '';

                if (lowerCaseMessage.includes('summarize')) {
                    analysisType = 'summarize';
                } else if (lowerCaseMessage.includes('extract entities')) {
                    analysisType = 'extract-entities';
                } else if (lowerCaseMessage.includes('answer question about')) {
                    analysisType = 'answer-question';
                    // Extract question within quotes
                    const questionMatch = userMessage.match(/"(.*?)"/);
                    if (questionMatch && questionMatch[1]) {
                        question = questionMatch[1];
                    } else {
                        // FIX APPLIED HERE: Using template literals (backticks)
                        updateAgentMessage(`Please specify the question for document analysis, e.g., "Answer question about MyDoc.pdf 'What is the main topic?'".`);
                        return; // Exit if question not found for 'answer-question'
                    }
                }

                updateAgentMessage(`Analyzing document "${targetDocumentName}" for ${analysisType} insight...`);

                response = await axios.post(import.meta.env.VITE_API_URL + "/api/document-analysis/analyze", {
                    filename: targetDocumentName,
                    analysisType: analysisType,
                    question: question, // Pass question only if analysisType is 'answer-question'
                });

                const data = response.data;
                updateAgentMessage(`**Document Analysis Results for "${data.filename}" (${data.analysisType}):**\n\n${data.aiAnalysis}`);
                return; // Exit after handling this specific request
            }


            // --- Process Insight (Improvements, Simulation, Automation, Documentation) ---
            if (lowerCaseMessage.includes("suggest improvements for") || lowerCaseMessage.includes("improve this process")) {
                const processDescription = userMessage.replace(/suggest improvements for|improve this process/i, '').trim();
                if (!processDescription) {
                    updateAgentMessage("Please provide a process description after 'suggest improvements for' or 'improve this process'.");
                    return;
                }
                updateAgentMessage("Analyzing process for improvements...");
                response = await axios.post(import.meta.env.VITE_API_URL + "/api/process-insight", {
                    processDescription: processDescription,
                    requestType: 'suggest_improvements'
                });
                updateAgentMessage(response.data.reply);
                return;
            }
            else if (lowerCaseMessage.includes("simulate this process") || lowerCaseMessage.includes("walk through this process")) {
                const processDescription = userMessage.replace(/simulate this process|walk through this process/i, '').trim();
                if (!processDescription) {
                    updateAgentMessage("Please provide a process description after 'simulate this process' or 'walk through this process'.");
                    return;
                }
                updateAgentMessage("Performing conceptual process simulation...");
                response = await axios.post(import.meta.env.VITE_API_URL + "/api/process-insight", {
                    processDescription: processDescription,
                    requestType: 'conceptual_simulation'
                });
                updateAgentMessage(response.data.reply);
                return;
            }
            else if (lowerCaseMessage.includes("automation steps for") || lowerCaseMessage.includes("automate this process")) {
                const processDescription = userMessage.replace(/automation steps for|automate this process/i, '').trim();
                if (!processDescription) {
                    updateAgentMessage("Please provide a process description after 'automation steps for' or 'automate this process'.");
                    return;
                }
                updateAgentMessage("Generating automation steps...");
                response = await axios.post(import.meta.env.VITE_API_URL + "/api/process-insight", {
                    processDescription: processDescription,
                    requestType: 'automation_steps'
                });
                updateAgentMessage(response.data.reply);
                return;
            }
            else if (lowerCaseMessage.includes("document this process") || lowerCaseMessage.includes("create documentation for this process")) {
                const processDescription = userMessage.replace(/document this process|create documentation for this process/i, '').trim();
                if (!processDescription) {
                    updateAgentMessage("Please provide a process description to document.");
                    return;
                }
                updateAgentMessage("Generating process documentation...");
                response = await axios.post(import.meta.env.VITE_API_URL + "/api/process-insight", {
                    processDescription: processDescription,
                    requestType: 'generate_documentation'
                });
                updateAgentMessage(response.data.reply);
                return;
            }

            // --- ERP/CRM Recommendation ---
            else if (lowerCaseMessage.includes("recommend an erp") || lowerCaseMessage.includes("suggest an erp") ||
                lowerCaseMessage.includes("recommend a crm") || lowerCaseMessage.includes("suggest a crm")) {

                updateAgentMessage("Generating ERP/CRM recommendation...");

                const dataForRecommendation = {
                    excelSummary: uploadedExcelSummary || "No Excel summary provided. Please upload an Excel file for data-driven recommendations.",
                    specificNeeds: userMessage.replace(/recommend an erp|suggest an erp|recommend a crm|suggest a crm/i, '').trim() || "General ERP/CRM recommendation.",
                    relevantDataDesc: uploadedExcelSummary ? "Analyzed data from Excel upload." : "No specific data provided.",
                    analysisResults: uploadedAnalysisResults.length > 0 ? uploadedAnalysisResults : ["No specific issues identified from Excel data."],
                };

                response = await axios.post(import.meta.env.VITE_API_URL + "/api/recommend", dataForRecommendation);
                updateAgentMessage(response.data.summary);
                return;
            }

            // --- Default Chat Response if no specific intent is matched ---
            updateAgentMessage("Thinking...");

            const chatResponse = await axios.post(import.meta.env.VITE_API_URL + "/api/chat", { message: userMessage });
            const data = chatResponse.data;

            const reply = data.reply || data.error || "❌ No reply.";

            updateAgentMessage(reply);

        } catch (err) {
            console.error("Request failed:", err);
            let errorMessage = "❌ Error processing request.";
            if (axios.isAxiosError(err) && err.response) { // Use axios.isAxiosError for better type guarding
                errorMessage = `Error: ${err.response.data?.error?.message || err.response.data?.error || err.response.statusText}`;
            } else if (err.message) {
                errorMessage = `Error: ${err.message}`;
            }
            updateAgentMessage(errorMessage);
            toast.error(errorMessage); // Show toast for all errors
        } finally {
            setLoading(false); // Ensure loading is always reset
        }
    };

    // Unified file upload handler for Excel, PDF, DOCX, TXT
    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        setLoading(true);
        setMessages((prev) => [...prev, { sender: "user", message: `📁 Uploading ${files.length} file(s)...` }]);
        updateAgentMessage("Please wait while I process your files.");

        const formData = new FormData();
        files.forEach(file => {
            formData.append("files", file); // 'files' must match backend's upload.array("files")
        });

        try {
            const uploadResponse = await axios.post(import.meta.env.VITE_API_URL + "/upload-files", formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const uploadedFileDetails = uploadResponse.data.files;
            let excelFilesUploaded = [];
            let docFilesUploaded = []; // To store names of newly uploaded non-excel documents
            let uploadMessages = [];

            uploadedFileDetails.forEach(file => {
                if (file.error) {
                    uploadMessages.push(`❌ Failed to process ${file.filename}: ${file.error}`);
                } else {
                    uploadMessages.push(`✅ Uploaded ${file.filename} (Type: ${file.type})`);
                    if (file.type === 'excel') {
                        excelFilesUploaded.push(file.filename);
                    } else if (['pdf', 'docx', 'txt'].includes(file.type)) { // Check for document types
                        docFilesUploaded.push(file.filename);
                    }
                }
            });

            updateAgentMessage(uploadMessages.join('\n')); // Show combined upload status

            // --- Consolidated Excel analysis (triggered automatically after Excel upload) ---
            if (excelFilesUploaded.length > 0) {
                updateAgentMessage("Analyzing ALL uploaded Excel data for consolidated insights...");
                const analysisResponse = await axios.post(import.meta.env.VITE_API_URL + "/api/excel-analysis/consolidated-analysis");

                setUploadedExcelSummary(analysisResponse.data.excelSummary);
                setUploadedAnalysisResults(analysisResponse.data.analysisResults);

                updateAgentMessage(
                    `✅ Consolidated Excel analysis complete. Here's what I found:\n\n` +
                    `**Summary:** ${analysisResponse.data.excelSummary}\n\n` +
                    `**Primary Domains:** ${analysisResponse.data.domain}\n\n` +
                    `**Relationships & Insights:** ${analysisResponse.data.relationshipsInsights}\n\n` +
                    `**Potential Issues:** ${analysisResponse.data.analysisResults.join('; ') || 'None'}\n\n` +
                    `You can now ask me to 'recommend an ERP' or 'suggest a CRM' based on this collective data.`
                );
            }

            // --- Update state for uploaded documents for later analysis ---
            if (docFilesUploaded.length > 0) {
                setUploadedDocumentNames(prev => {
                    const newNames = new Set([...prev, ...docFilesUploaded]); // Use Set to avoid duplicates
                    return Array.from(newNames);
                });
                // Inform user how to interact with the newly uploaded documents
                updateAgentMessage(
                    `Document(s) ready for analysis. You can now ask me to:\n` +
                    `\n- 'analyze document ${docFilesUploaded[0]}' ` +
                    `\n- 'summarize ${docFilesUploaded[0]}'` +
                    `\n- 'extract entities from ${docFilesUploaded[0]}'` +
                    `\n- 'answer question about ${docFilesUploaded[0]} "What is the main topic?"'`
                );
            }


        } catch (err) {
            console.error("File upload or analysis failed:", err);
            let errorMessage = "❌ Error uploading or analyzing files.";
            if (axios.isAxiosError(err) && err.response) {
                errorMessage += ` Details: ${err.response.data?.error?.message || err.response.statusText}`;
            } else if (err.message) {
                errorMessage += ` Details: ${err.message}`;
            }
            updateAgentMessage(errorMessage); // Show message in chat
            toast.error(errorMessage); // Show toast notification
        } finally {
            setLoading(false);
            e.target.value = null; // Clear the file input element to allow re-uploading the same file
        }
    };

    const handleAsisImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setAsisImageFile(file);
        setMessages((prev) => [...prev, { sender: "user", message: `Uploaded AS-IS image: ${file.name}.` }]);
        updateAgentMessage("AS-IS image uploaded successfully. Now, type your transformation request (e.g., 'Create a TO-BE process based on HubSpot') or general analysis query.");
        e.target.value = null;
    };

    const handleAnalyzeImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setMessages((prev) => [...prev, { sender: "user", message: `Analyzing image: ${file.name}...` }]);
        setLoading(true);
        updateAgentMessage("Analyzing image content...");

        const formData = new FormData();
        formData.append("image", file);
        formData.append("prompt", input.trim() || "Describe this image in detail and identify any processes or objects shown.");

        try {
            const response = await axios.post(import.meta.env.VITE_API_URL + "/api/analyze-image", formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const reply = response.data.description || response.data.reply || "No description provided.";
            updateAgentMessage(reply);
        } catch (error) {
            console.error("Image analysis failed:", error);
            let errorMessage = "❌ Error analyzing image.";
            if (axios.isAxiosError(error) && error.response) {
                errorMessage += ` Details: ${error.response.data?.error?.message || error.response.statusText}`;
            } else if (error.message) {
                errorMessage += ` Details: ${error.message}`;
            }
            updateAgentMessage(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
            e.target.value = null;
        }
    };


    return (
        <ThemeProvider theme={theme}>
            <Box sx={{ display: "flex", bgcolor: theme.palette.background.default, minHeight: '100vh' }}>
                <CssBaseline />
                <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: theme.palette.primary.main }}>
                    <Toolbar>
                        <Typography variant="h6" noWrap component="div">
                            AI Assistant
                        </Typography>
                    </Toolbar>
                </AppBar>
                <Drawer
                    variant="permanent"
                    sx={{
                        width: drawerWidth,
                        flexShrink: 0,
                        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: "border-box" },
                    }}
                >
                    <Toolbar />
                    <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
                        <List>
                            <ListItem disablePadding>
                                <ListItemButton>
                                    <ListItemText primary="💬 General Chat" />
                                </ListItemButton>
                            </ListItem>
                            <ListItem disablePadding>
                                <ListItemButton>
                                    <ListItemText primary="📊 Upload & Analyze Data (Excel, PDF, DOCX, TXT)" />
                                </ListItemButton>
                            </ListItem>
                            <ListItem disablePadding>
                                <ListItemButton>
                                    <ListItemText primary="📝 Process Insights (Improve, Simulate, Automate, Document)" />
                                </ListItemButton>
                            </ListItem>
                            <ListItem disablePadding>
                                <ListItemButton>
                                    <ListItemText primary="🔄 Process Transformation (AS-IS to TO-BE)" />
                                </ListItemButton>
                            </ListItem>
                            <ListItem disablePadding>
                                <ListItemButton>
                                    <ListItemText primary="🖼️ Analyze Any Image" />
                                </ListItemButton>
                            </ListItem>
                            <ListItem disablePadding>
                                <ListItemButton>
                                    <ListItemText primary="🏢 ERP/CRM Recommendations" />
                                </ListItemButton>
                            </ListItem>
                        </List>
                    </Box>
                </Drawer>

                <Box component="main" sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column', height: '100vh' }}>
                    <Toolbar />
                    <Typography variant="h4" gutterBottom>Your AI Assistant</Typography>

                    <Container maxWidth="xl" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <Paper
                            elevation={6}
                            sx={{
                                width: "100%",
                                flexGrow: 1,
                                overflowY: "auto",
                                p: 2,
                                display: "flex",
                                flexDirection: "column",
                                mb: 2,
                                backgroundColor: theme.palette.background.paper,
                                borderRadius: 3,
                            }}
                        >
                            {messages.map((msg, idx) => (
                                <ChatMessage
                                    key={idx}
                                    sender={msg.sender}
                                    message={msg.message}
                                    imageUrl={msg.imageUrl}
                                    chartData={msg.chartData}
                                    chartType={msg.chartType}
                                    chartExplanation={msg.chartExplanation}
                                />
                            ))}
                            <div ref={messagesEndRef} />
                        </Paper>

                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 'auto', pb: 2 }}>
                            {/* General File Upload (Excel, PDF, DOCX, TXT) */}
                            <input
                                type="file"
                                onChange={handleFileUpload}
                                style={{ display: "none" }}
                                id="file-upload-input" // General ID for all file types
                                accept=".xlsx,.xls,.pdf,.docx,.txt" // Combined accept
                                multiple
                            />
                            <label htmlFor="file-upload-input">
                                <Button variant="contained" component="span" startIcon={<CloudUploadIcon />} disabled={loading} color="secondary">
                                    Upload File(s)
                                </Button>
                            </label>

                            {/* AS-IS Image Upload */}
                            <input
                                type="file"
                                onChange={handleAsisImageUpload}
                                style={{ display: "none" }}
                                id="asis-image-upload"
                                accept="image/*"
                            />
                            <label htmlFor="asis-image-upload">
                                <Button variant="contained" component="span" startIcon={<ImageIcon />} disabled={loading} color="secondary">
                                    Upload AS-IS
                                </Button>
                            </label>

                            {/* Analyze Image Upload */}
                            <input
                                type="file"
                                onChange={handleAnalyzeImageUpload}
                                style={{ display: "none" }}
                                id="image-analysis-upload"
                                accept="image/*"
                            />
                            <label htmlFor="image-analysis-upload">
                                <Button variant="contained" component="span" startIcon={<AnalyzeIcon />} disabled={loading} color="secondary">
                                    Analyze Image
                                </Button>
                            </label>

                            {/* Text Input Field */}
                            <TextField
                                fullWidth
                                placeholder="Ask me anything, e.g., 'Show sales by month', 'Document this process: ...', 'Analyze document report.pdf', 'Recommend an ERP'"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                sx={{ borderRadius: 1, bgcolor: theme.palette.background.paper }}
                                disabled={loading}
                                size="medium"
                            />

                            {/* Send Button */}
                            <IconButton
                                color="primary"
                                onClick={handleSend}
                                disabled={loading || (!input.trim() && !asisImageFile)} // Disable if no input and no AS-IS image
                                sx={{
                                    backgroundColor: theme.palette.primary.main,
                                    color: "white",
                                    "&:hover": { backgroundColor: theme.palette.secondary.main },
                                    boxShadow: theme.shadows[3],
                                    borderRadius: 8,
                                    p: 1.5,
                                }}
                            >
                                <SendIcon />
                            </IconButton>
                        </Stack>
                    </Container>
                </Box>
            </Box>
            <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
        </ThemeProvider>
    );
}

export default App;