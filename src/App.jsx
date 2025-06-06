import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, BrainCircuit, Sigma, Puzzle, Wand2, LoaderCircle } from 'lucide-react';

// --- Helper for OpenAI ChatGPT API Calls ---
const callOpenAIAPI = async (prompt, isJson = false) => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const apiUrl = 'https://api.openai.com/v1/chat/completions';

    const payload = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
    };

    if (isJson) {
        payload.response_format = { type: 'json_object' };
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('API Error Response:', errorBody);
            throw new Error(`API call failed with status: ${response.status}`);
        }

        const result = await response.json();
        const text = result.choices?.[0]?.message?.content?.trim();
        if (!text) {
            throw new Error('No content received from API.');
        }
        return isJson ? JSON.parse(text) : text;
    } catch (error) {
        console.error('Error calling OpenAI API:', error);
        throw error;
    }
};

// Extract multiple choice options if present
const parseOptions = (text) => {
    const optionRegex = /\(([A-D])\)\s*([^()\n]+)/g;
    const options = [];
    let match;
    let firstIndex = null;
    while ((match = optionRegex.exec(text)) !== null) {
        if (firstIndex === null) firstIndex = match.index;
        options.push({ label: match[1], text: match[2].trim() });
    }
    if (options.length >= 2) {
        return { question: text.slice(0, firstIndex).trim(), options };
    }
    return { question: text, options: null };
};

// Evaluate the user's answer using OpenAI
const evaluateAnswer = async (question, correctAnswer, userAnswer) => {
    const prompt = `You are grading an 11+ practice question.\nQuestion: "${question}"\nCorrect answer: "${correctAnswer}"\nStudent answer: "${userAnswer}"\nRespond in Korean as JSON {"isCorrect":true|false,"feedback":"short feedback"}`;
    try {
        return await callOpenAIAPI(prompt, true);
    } catch {
        return { isCorrect: false, feedback: '채점에 실패했습니다.' };
    }
};


// --- Mock Data: This is now a fallback or initial state ---
const QUESTIONS_DATA = {
    "영어": {
        icon: BookOpen,
        color: "text-blue-500",
        bgColor: "bg-blue-100",
    },
    "수학": {
        icon: Sigma,
        color: "text-red-500",
        bgColor: "bg-red-100",
    },
    "언어추론": {
        icon: BrainCircuit,
        color: "text-green-500",
        bgColor: "bg-green-100",
    },
    "비언어추론": {
        icon: Puzzle,
        color: "text-purple-500",
        bgColor: "bg-purple-100",
    }
};

// --- Components ---

const DomainButton = ({ domain, Icon, color, bgColor, onClick, isActive, onGenerate, isGenerating }) => (
    <div className="flex flex-col items-center gap-2">
         <button
            onClick={onClick}
            className={`flex items-center justify-center w-full sm:w-auto flex-1 sm:flex-none px-6 py-3 rounded-lg shadow-md transition-all duration-300 transform hover:-translate-y-1 ${isActive ? `${bgColor} ${color} font-bold ring-2 ring-offset-2 ring-current` : 'bg-white hover:bg-gray-50'}`}
        >
            <Icon className={`mr-3 h-6 w-6 ${color}`} />
            <span className="text-lg">{domain}</span>
        </button>
        <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
        >
            {isGenerating ? (
                <>
                    <LoaderCircle className="w-4 h-4 animate-spin" />
                    <span>생성중...</span>
                </>
            ) : (
                <>
                    <Wand2 className="w-4 h-4" />
                    <span>✨ 새 문제</span>
                </>
            )}
        </button>
    </div>
);

const QuestionCard = ({ questionData, domain }) => {
    const [showAnswer, setShowAnswer] = useState(false);
    const [hint, setHint] = useState(null);
    const [isHintLoading, setIsHintLoading] = useState(false);
    const [error, setError] = useState(null);
    const [userAnswer, setUserAnswer] = useState('');
    const [evaluation, setEvaluation] = useState(null);
    const [isChecking, setIsChecking] = useState(false);

    useEffect(() => {
        setShowAnswer(false);
        setHint(null);
        setError(null);
        setUserAnswer('');
        setEvaluation(null);
    }, [questionData]);

    const handleGetHint = async () => {
        if (!questionData) return;
        setIsHintLoading(true);
        setHint(null);
        setError(null);
        try {
            const prompt = `You are a helpful 11+ tutor. Provide a single, simple hint for the following ${domain} question, but do not give away the answer. The hint should be a clue to guide an 11-year-old student. Keep it to one sentence in Korean.\n\nQuestion: "${questionData.question}"`;
            const generatedHint = await callOpenAIAPI(prompt);
            setHint(generatedHint);
        } catch (err) {
            setError('힌트를 가져오는 데 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsHintLoading(false);
        }
    };

    if (!questionData) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl shadow-lg h-96">
                <BrainCircuit className="w-24 h-24 text-gray-300 mb-4" />
                <h2 className="text-2xl font-bold text-gray-600">11+ 스마트 튜터에 오신 것을 환영합니다!</h2>
                <p className="text-gray-500 mt-2">상단의 과목을 선택하거나, '새 문제' 버튼을 눌러 연습을 시작하세요.</p>
            </div>
        );
    }
    
    const { type, passage, question, answer } = questionData;
    const { question: cleanQuestion, options } = parseOptions(question);

    const handleCheckAnswer = async () => {
        if (!userAnswer.trim()) return;
        setIsChecking(true);
        try {
            const result = await evaluateAnswer(question, answer, userAnswer);
            setEvaluation(result);
        } catch (err) {
            setEvaluation({ isCorrect: false, feedback: '채점에 실패했습니다.' });
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full transition-all duration-500 animate-fade-in">
            <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">{type || domain}</h3>
            {passage && passage.length > 10 && <p className="mt-4 text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-200 whitespace-pre-wrap">{passage}</p>}
            <p className="mt-6 text-xl font-medium text-gray-800">{cleanQuestion}</p>

            {options ? (
                <div className="mt-4 flex flex-col gap-2">
                    {options.map((opt) => (
                        <label key={opt.label} className="flex items-center gap-2">
                            <input
                                type="radio"
                                name="mcq"
                                value={opt.label}
                                checked={userAnswer === opt.label}
                                onChange={(e) => setUserAnswer(e.target.value)}
                            />
                            <span>{opt.label}. {opt.text}</span>
                        </label>
                    ))}
                </div>
            ) : (
                <input
                    type="text"
                    className="mt-4 w-full p-2 border rounded"
                    placeholder="답을 입력하세요"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                />
            )}

            <button
                onClick={handleCheckAnswer}
                disabled={isChecking || !userAnswer.trim()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
            >
                {isChecking ? '채점중...' : '답안 제출'}
            </button>

            {evaluation && (
                <p className={`mt-4 font-semibold ${evaluation.isCorrect ? 'text-green-600' : 'text-red-600'}`}>{evaluation.feedback}</p>
            )}
            
            <div className="mt-8 flex flex-wrap gap-4 items-center">
                <button onClick={() => setShowAnswer(!showAnswer)} className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all">
                    {showAnswer ? '정답 숨기기' : '정답 확인'}
                </button>
                 <button onClick={handleGetHint} disabled={isHintLoading} className="px-6 py-2 bg-amber-500 text-white font-semibold rounded-lg shadow-md hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-400 transition-all disabled:bg-gray-400 flex items-center gap-2">
                    {isHintLoading ? <LoaderCircle className="w-5 h-5 animate-spin"/> : <Wand2 className="w-5 h-5"/>}
                    ✨ 힌트 보기
                </button>
            </div>
            
            {error && <p className="text-red-500 mt-4">{error}</p>}
            
            {hint && (
                 <div className="mt-6 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg animate-fade-in">
                    <h4 className="font-bold text-amber-800">힌트!</h4>
                    <p className="mt-1 text-gray-700">{hint}</p>
                </div>
            )}

            {showAnswer && (
                <div className="mt-6 p-6 bg-green-50 border-l-4 border-green-500 rounded-r-lg animate-fade-in">
                    <h4 className="font-bold text-green-800">정답 및 해설</h4>
                    <p className="mt-2 text-gray-700 whitespace-pre-wrap">{answer}</p>
                </div>
            )}
        </div>
    );
};

const ChatBox = ({ isVisible, onClose, currentQuestion }) => {
    const [messages, setMessages] = useState([
        { from: 'ai', text: '안녕하세요! 현재 문제나 다른 11+ 관련 질문이 있다면 무엇이든 물어보세요.' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const newMessages = [...messages, { from: 'user', text: input }];
        setMessages(newMessages);
        const userMessage = input;
        setInput('');
        setIsLoading(true);

        try {
            let prompt = `You are a friendly and encouraging 11+ tutor AI. Your answers must be in Korean and easy for an 11-year-old to understand.`;
            if (currentQuestion) {
                 prompt += `\n\nThe student is currently looking at this question:\nType: ${currentQuestion.type || ''}\nQuestion: "${currentQuestion.question}"\n\nConsidering this context, answer the student's following query concisely: "${userMessage}"`;
            } else {
                prompt += `\n\nAnswer the student's following query concisely: "${userMessage}"`;
            }
            
            const answer = await callOpenAIAPI(prompt);
            setMessages(prev => [...prev, { from: 'ai', text: answer }]);
        } catch (error) {
            setMessages(prev => [...prev, { from: 'ai', text: "죄송해요, 답변을 가져오는 데 문제가 생겼어요. 잠시 후 다시 시도해주세요." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`fixed top-0 right-0 h-full w-full md:w-96 bg-gray-800 bg-opacity-80 backdrop-blur-sm transition-transform duration-500 ease-in-out z-50 ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex flex-col h-full bg-white/80 shadow-2xl rounded-l-2xl">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-gray-800">AI 튜터</h3>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex my-2 ${msg.from === 'ai' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`px-4 py-2 rounded-2xl max-w-xs md:max-w-sm break-words ${msg.from === 'ai' ? 'bg-gray-200 text-gray-800 rounded-bl-none' : 'bg-blue-600 text-white rounded-br-none'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex justify-start my-2">
                            <div className="px-4 py-2 rounded-2xl bg-gray-200 text-gray-800 rounded-bl-none">
                                <div className="flex items-center space-x-1">
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="질문을 입력하세요..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                        />
                        <button onClick={handleSend} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-r-lg hover:bg-blue-700 disabled:bg-blue-300" disabled={isLoading || !input.trim()}>
                            전송
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default function App() {
    const [activeDomain, setActiveDomain] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [isChatVisible, setIsChatVisible] = useState(false);
    const [generatingDomain, setGeneratingDomain] = useState(null);
    const [generationError, setGenerationError] = useState(null);

    const handleGenerateQuestion = async (domain) => {
        setGeneratingDomain(domain);
        setGenerationError(null);
        setCurrentQuestion(null);
        setActiveDomain(domain);

        try {
            const prompt = `Create a new, high-quality 11+ exam style question for an 11-year-old student. The subject is "${domain}". The question must be in English.
            - For '영어' (English), it could be a reading comprehension, grammar, or vocabulary question. Include a passage if necessary.
            - For '수학' (Math), it should be a word problem testing logic and mathematical skills.
            - For '언어추론' (Verbal Reasoning), it could involve sequences, analogies, or code-breaking.
            - For '비언어추론' (Non-verbal Reasoning), describe a visual pattern puzzle.
            
            Provide a detailed answer and explanation in Korean.

            Return the response ONLY in the following JSON format:
            {"type": "Generated ${domain} Question", "passage": "...", "question": "...", "answer": "..."}
            Ensure the 'passage' key is included, but its value can be an empty string if not needed.`;
            
            const newQuestion = await callOpenAIAPI(prompt, true);
            setCurrentQuestion(newQuestion);

        } catch (error) {
            setGenerationError(`'${domain}' 문제를 생성하는 데 실패했습니다. 잠시 후 다시 시도해 주세요.`);
        } finally {
            setGeneratingDomain(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <header className="bg-white shadow-sm p-4 sticky top-0 z-40">
                <div className="container mx-auto flex justify-between items-center">
                    <div className='flex items-center gap-2'>
                       <Wand2 className="w-8 h-8 text-indigo-600"/>
                       <h1 className="text-2xl font-bold text-gray-800">11+ ChatGPT 튜터</h1>
                    </div>
                    <button onClick={() => setIsChatVisible(true)} className="fixed bottom-5 right-5 z-50 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition transform hover:scale-110">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </button>
                </div>
            </header>
            
            <main className="container mx-auto p-4 sm:p-6">
                <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
                    <div className="flex flex-wrap gap-4 justify-center">
                        {Object.entries(QUESTIONS_DATA).map(([domain, { icon, color, bgColor }]) => (
                            <DomainButton
                                key={domain}
                                domain={domain}
                                Icon={icon}
                                color={color}
                                bgColor={bgColor}
                                isActive={activeDomain === domain}
                                onClick={() => {
                                    setActiveDomain(domain);
                                    setCurrentQuestion(null); // Clear old question
                                    setGenerationError(null);
                                }}
                                onGenerate={() => handleGenerateQuestion(domain)}
                                isGenerating={generatingDomain === domain}
                            />
                        ))}
                    </div>
                </div>

                <div className="w-full max-w-4xl mx-auto">
                    {generatingDomain && <LoaderCircle className="w-12 h-12 text-indigo-600 animate-spin mx-auto my-12" />}
                    {generationError && !generatingDomain && <p className="text-center text-red-500 bg-red-100 p-4 rounded-lg">{generationError}</p>}
                    {!generatingDomain && <QuestionCard questionData={currentQuestion} domain={activeDomain} />}
                </div>
            </main>
            
            <ChatBox 
                isVisible={isChatVisible} 
                onClose={() => setIsChatVisible(false)}
                currentQuestion={currentQuestion}
            />

             <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
             `}</style>
        </div>
    );
}
