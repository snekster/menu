import dotenv from 'dotenv';
import { GoogleGenAI, Type } from "@google/genai";
import fs from 'fs/promises';
import readline from 'readline/promises';

dotenv.config();

const ai = new GoogleGenAI({});

/**
 * Преобразует текстовый ввод с различными разделителями в массив строк.
 * Эта функция остается ТОЧНО ТАКОЙ ЖЕ.
 * @param {string | null | undefined} inputText Входной текст для парсинга.
 * @returns {string[]} Массив очищенных строк.
 */
function parseTextToList(inputText) {
  if (!inputText || typeof inputText !== 'string') {
    return [];
  }
  const delimiters = /[\n,;]+/;
  return inputText
    .split(delimiters)
    .map(item => item.trim())
    .filter(Boolean);
}

async function main() {
  const filePath = 'menu.txt'; // Имя файла, из которого будем читать

  try {
    console.log(`Читаю данные из файла: ${filePath}...`);
    
    // Читаем все содержимое файла в виде одной строки
    // 'utf8' - обязательный параметр, чтобы получить текст, а не бинарные данные
    const rawInput = await fs.readFile(filePath, 'utf8');

    // Используем нашу универсальную функцию для парсинга
    const menuItems = parseTextToList(rawInput);

    if (menuItems.length === 0) {
      console.log(`Файл "${filePath}" пуст или не содержит подходящих данных. Работа завершена.`);
      return;
    }

    console.log(`\nОтправляю запрос со списком блюд: [${menuItems.join(', ')}]`);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents:
                `
                YOU ARE AN EXPERIENCED CHEF AND MENU SYSTEM ARCHITECT.
                TASK:
                1. Create a hierarchical structure for the restaurant menu.
                2. Distribute add-ons for each main menu item (in the menu hierarchy, add-ons (side dishes, sauces, toppings) should not be a “high” level category), defining a list of suitable add-ons based on their logical type and general context.
                3. If the list of child elements (add-ons, dishes, options) for any entity exceeds 6 elements, you MUST reorganize this list. Distribute the items, leaving none outside their boundaries, based on their common properties (e.g., “Sauces,” “Vegetarian Pizzas,” etc., until the condition is satisfied).
                4. Determine locations based on the principle of contextual relevance.
                5. Highlight the sizes of the dishes.
                6. IMPORTANT: Do not invent dishes for fictional or non-existent products. Even if the name seems meaningless.
                Analyze the following text by creating a hierarchical structure for the restaurant menu: [${menuItems.join(', ')}]
                `,
            config: {
                responseMimeType: "application/json",
                maxOutputTokens: 16000,
            },
        });

        const jsonText = response.text;

        // --- ДЛЯ ПРОСМТОРА ---
        console.log("--- ОТВЕТ ОТ LLM ---");
        console.log(jsonText);
        console.log("--- КОНЕЦ ОТВЕТА ---");

        const formattedJson = JSON.stringify(JSON.parse(jsonText), null, 2);

        await fs.writeFile('menu.json', formattedJson, 'utf8');
        console.log('\n Меню сохранено в файл menu.json');

  } catch (error) {
    // Добавим обработку ошибок, если файл не найден
    if (error.code === 'ENOENT') {
      console.error(`Ошибка: Файл "${filePath}" не найден. Пожалуйста, создайте его рядом со скриптом.`);
    } else {
      console.error("Произошла непредвиденная ошибка при чтении файла:", error);
    }
  }
}

main();