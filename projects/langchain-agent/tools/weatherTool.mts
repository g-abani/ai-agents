import { tool } from "@langchain/core/tools";
import { z } from "zod";

const getWeather = tool(
    async (input: { city: string }) => {
        return `It's always sunny in ${input.city}!`;
    },
    {
        name: "getWeather",
        schema: z.object({
            city: z.string().describe("The city to get the weather for"),
        }),
        description: "Get weather for a given city.",
    }
);
export default getWeather;