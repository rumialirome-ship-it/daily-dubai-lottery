import { GoogleGenAI, Type } from "@google/genai";
import { Draw, Bet, Client, SmartAnalysisReport } from '../types';
import { isBetWinner } from '../utils/helpers';

const API_KEY = process.env.API_KEY;
let ai: GoogleGenAI | null = null;

if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
    // This message will be visible in the developer console.
    console.error("Gemini API Key is missing. AI-powered analysis will be disabled. Please provide the API_KEY environment variable during the build process.");
}

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    headline: { type: Type.STRING, description: 'A brief, catchy headline summarizing the draw result. Max 15 words.' },
    netProfitAnalysis: { type: Type.STRING, description: 'A short sentence analyzing the net profit or loss figure. Example: "The company secured a healthy profit from this draw."' },
    performanceAnalysis: { type: Type.STRING, description: 'Analysis of the draw\'s performance, considering participation levels (number of bets). Example: "Participation was moderate, indicating steady player engagement."' },
    conclusion: { type: Type.STRING, description: 'A concluding remark or a forecast for future draws. Example: "Overall, a successful draw. Future promotions could boost participation further."' }
  },
  required: ['headline', 'netProfitAnalysis', 'performanceAnalysis', 'conclusion']
};

export const getSmartAnalysis = async (data: { draw: Draw; bets: Bet[]; clients: Client[] }): Promise<SmartAnalysisReport | string> => {
    // If the API key was not provided, return an informative message to be displayed in the UI.
    if (!ai) {
        return "AI analysis is disabled. The Google Gemini API key was not provided during the application build.";
    }
    
    const { draw, bets, clients } = data;
    const totalStake = bets.reduce((sum, bet) => sum + bet.stake, 0);
    const winningBets = bets.filter(bet => isBetWinner(bet, draw.winningNumbers));
    const uniqueWinners = new Set(winningBets.map(b => b.clientId)).size;

    const clientMap = new Map(clients.map(c => [c.id, c]));
    const totalPayout = winningBets.reduce((sum, bet) => {
        const client = clientMap.get(bet.clientId);
        if (!client || !client.prizeRates) return sum;

        const conditionKey = bet.condition.toLowerCase() as 'first' | 'second';
        const gamePrizeRates = client.prizeRates[bet.gameType as keyof typeof client.prizeRates];

        if (gamePrizeRates && typeof gamePrizeRates[conditionKey] === 'number') {
            const rate = gamePrizeRates[conditionKey];
            const winnings = bet.stake * (rate / 100);
            return sum + winnings;
        }

        return sum;
    }, 0);
    
    const netProfit = totalStake - totalPayout;

    const prompt = `
        Analyze the following lottery draw data and provide a summary in the requested JSON format.
        Data for your analysis:
        - Draw Name: Draw ${draw.name}
        - Winning Numbers: ${draw.winningNumbers?.join(', ')}
        - Total Bets Placed: ${bets.length}
        - Total Stake Collected: ${totalStake.toFixed(2)}
        - Net Profit for the Company: ${netProfit.toFixed(2)}
    `;

    try {
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: analysisSchema
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating analysis with Gemini API:", error);
        return "An error occurred while generating the report. The AI model may be temporarily unavailable or the response was not valid. Please try again.";
    }
};
