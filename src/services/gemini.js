import { GoogleGenAI } from "@google/genai";

// Vite の環境変数から API キーを読み込んでインスタンス化
const ai = new GoogleGenAI({ 
  apiKey: import.meta.env.VITE_GEMINI_API_KEY 
});

/**
 * File オブジェクトまたは Base64 Data URL を Gemini SDK が要求する Part 形式に変換
 * @param {File|string} fileOrBase64 
 * @returns {Promise<{inlineData: {data: string, mimeType: string}}>}
 */
async function fileToGenerativePart(fileOrBase64) {
  // すでに Data URL (data:image/jpeg;base64,...) の文字列である場合
  if (typeof fileOrBase64 === "string" && fileOrBase64.startsWith("data:")) {
    const [header, base64Data] = fileOrBase64.split(",");
    const mimeType = header.match(/:(.*?);/)[1];
    return { inlineData: { data: base64Data, mimeType } };
  }

  // File オブジェクトの場合
  const arrayBuffer = await fileOrBase64.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
  );
  return { inlineData: { data: base64, mimeType: fileOrBase64.type } };
}

/**
 * AI占い鑑定の実行関数
 * @param {Object} params
 * @param {Object} params.profile - { name, birthDate, birthTime, gender }
 * @param {Array<File|string>} params.images - 画像ファイルまたは Base64 URL の配列
 * @param {string} params.fortunePrompt - システム指示（基本占いプロンプト）
 * @param {string} params.correctionPrompt - 用語・正誤補正プロンプト
 * @param {string|null} [params.previousResult=null] - 比較分析用の前回の鑑定結果テキスト
 * @returns {Promise<string>} Gemini による鑑定出力テキスト
 */
export async function runFortuneTelling({
  profile,
  images = [],
  fortunePrompt,
  correctionPrompt,
  previousResult = null,
}) {
  const contents = [];

  // 1. システムプロンプト（指示文）の組み立て
  let systemInstruction = fortunePrompt || "あなたは親切で高度な鑑定技術を持つプロの占い師です。";
  if (correctionPrompt) {
    systemInstruction += `\n\n【用語・誤り正し補正ルール】:\n${correctionPrompt}`;
  }

  // 2. 相談者プロフィールのテキスト構築
  let userText = `【相談者プロフィール】\n`;
  userText += `氏名/ニックネーム: ${profile.name}\n`;
  userText += `生年月日: ${profile.birthDate}\n`;
  userText += `出生時間: ${profile.birthTime || "不明"}\n`;
  userText += `性別: ${profile.gender || "未回答"}\n`;

  // 比較・派生鑑定（parentId が指定されている場合）のコンテキスト追加
  if (previousResult) {
    userText += `\n【過去の鑑定結果との比較・変化の分析依頼】\n`;
    userText += `以下は相談者の過去の鑑定結果です:\n"${previousResult}"\n`;
    userText += `上記の過去結果と今回新しく提供されたプロフィール・画像を比較し、どのような変化や新たな運勢の兆しが出ているかを詳しく解説・アドバイスしてください。\n`;
  }

  contents.push(userText);

  // 3. 画像データのコンバートと追加
  for (const img of images) {
    if (img) {
      const part = await fileToGenerativePart(img);
      contents.push(part);
    }
  }

  // 4. Gemini 2.5 Flash モデルによる生成リクエスト
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: contents,
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.7,
    },
  });

  return response.text;
}

/**
 * 鑑定結果に対する追加チャット分析の実行関数
 * @param {string} newQuestion - ユーザーからの追加質問
 * @param {string} fortuneContext - 元の初回鑑定結果テキスト
 * @returns {Promise<string>} AIからの分析・回答テキスト
 */
export async function analyzeFortuneChat(newQuestion, fortuneContext) {
  // 元の鑑定結果をコンテキスト（背景情報）としてシステム指示にセット
  const systemInstruction = `あなたは経験豊富な占い師です。以下の【元の鑑定結果】に基づいて、ユーザーからの追加質問や深掘りの分析リクエストに丁寧かつ具体的に回答してください。\n\n【元の鑑定結果】:\n${fortuneContext}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `【ユーザーの追加質問】:\n${newQuestion}`,
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.7,
    },
  });

  return response.text;
}