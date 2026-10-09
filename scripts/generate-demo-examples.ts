import {demoExamples} from "../src/reporting/sheets.ts";
import {csvText} from "../src/domain/assessment.ts";
await Deno.writeTextFile("docs/demo-examples.csv",csvText(demoExamples()));
console.log("Generated six fictional examples with the shared evaluation rules.");
