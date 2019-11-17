import { promises as fs } from "fs";
import * as path from "path";

export function raw(string: TemplateStringsArray | string) {
	return { __raw: `${string}` };
}

export function templateGenerator<InType>(helper: (str: InType) => string) {
	type ValueArrayType = (InType | string | { __raw: string })[];
	return (strings: TemplateStringsArray, ...values: ValueArrayType) => {
		const result: ValueArrayType = [];
		strings.forEach((str, i) => {
			result.push(raw(str), values[i] || "");
		});
		return result
			.map(el =>
				typeof (el as { __raw: string }).__raw === "string"
					? (el as { __raw: string }).__raw
					: helper(el as InType)
			)
			.join("");
	};
}

export function escapeHTML(html: string) {
	return html
		.split("&")
		.join("&amp;")
		.split('"')
		.join("&quot;")
		.split("<")
		.join("&lt;")
		.split(">")
		.join("&gt;");
}

export const html_ = templateGenerator((v: string) => htmlMD(escapeHTML(v)));
// just html triggers prettier

async function recursiveReaddir(start: string): Promise<string[]> {
	const files = await fs.readdir(start);
	const finalFiles: string[] = [];
	await Promise.all(
		files.map(async f => {
			const fileStats = await fs.stat(path.join(start, f));
			if (fileStats.isDirectory()) {
				finalFiles.push(
					...(await recursiveReaddir(path.join(start, f))).map(r =>
						path.join(f, r)
					)
				);
			} else {
				finalFiles.push(f);
			}
		})
	);
	return finalFiles;
}

function parseDoubleBrackets(
	remaining: string
): { done: string; remaining: string } | undefined {
	// {{Command|text... {{Link|hmm}}text...}}
	const firstDoubleBrackets = remaining.indexOf("{{");
	if (firstDoubleBrackets < 0) {
		return;
	}
	let finalDone = "";
	let parseInsideResult: ReturnType<typeof parseDoubleBrackets>;
	while (
		(parseInsideResult = parseDoubleBrackets(
			remaining.substr(firstDoubleBrackets)
		))
	) {
		finalDone += parseInsideResult.done;
		remaining = parseInsideResult.remaining;
	}
}

function htmlMD(text: string) {
	text = text.replace(
		/{{Channel\|(.+?)}}/g,
		(q, v) => `<a class="tag">${v}</a>`
	);
	return text;
}

async function processText(
	path: string[],
	text: string
): Promise<{ html: string; discord: string }> {
	const htmlResult: string[] = [];
	const discordResult: string[] = [];

	const lines = text.split("\n");
	for (const line of lines) {
		if (line.startsWith("## ")) {
			const v = line.substr(3);
			htmlResult.push(html_`<h2>${v}</h2>`);
			discordResult.push(`**${v}**`);
			continue;
		}
		if (line.startsWith("*text*: ")) {
			const v = line.substr(8);
			htmlResult.push(html_`<p>${v}</p>`);
			discordResult.push(v);
			continue;
		}
		if (line.startsWith("*link*: ")) {
			const v = line.substring(19 + 1, line.length - 1);
			htmlResult.push(
				html_`<p><a href="/${[...path, v].join("/")}">${v}</a></p>`
			);
			discordResult.push(`\`ip!${[...path, v].join(" ")}\``);
			continue;
		}
		if (line.startsWith("*link web=inline*: ")) {
			const v = line.substring(19 + 1, line.length - 1);
			htmlResult.push(
				html_`<p><a inline="true" href="/${[...path, v].join(
					"/"
				)}">${v}</a></p>`
			);
			discordResult.push(`\`ip!${[...path, v].join(" ")}\``);
			continue;
		}
		if (!line.trim()) {
			discordResult.push("");
			continue;
		}
		if (line.startsWith("*when discord*: ")) {
			const v = line.substr(16);
			discordResult.push(v);
			continue;
		}
		throw new Error(`unrecognized option:::${line}`);
	}

	return { html: htmlResult.join("\n"), discord: discordResult.join("\n") };
}

const dirname = (fullpath: string) =>
	fullpath.substr(0, fullpath.lastIndexOf("/"));

(async () => {
	const start = path.join(__dirname, "../doc/content");
	await fs.rmdir(path.join(__dirname, "../dist"), { recursive: true });
	const filesToCopy = await recursiveReaddir(
		path.join(__dirname, "../doc/public")
	);
	for (const fileToCopy of filesToCopy) {
		await fs.mkdir(path.join(__dirname, "../dist/", dirname(fileToCopy)), {
			recursive: true
		});
		await fs.copyFile(
			path.join(__dirname, "../doc/public", fileToCopy),
			path.join(__dirname, "../dist", fileToCopy)
		);
	}
	const discorddist = path.join(__dirname, "../dist/discord");
	const webdist = path.join(__dirname, "../dist/web");
	const filesToProcess = (await recursiveReaddir(start)).filter(f =>
		f.endsWith(".dg")
	);
	const htmlTemplate = await fs.readFile(
		path.join(__dirname, "../doc/template.html"),
		"utf-8"
	);

	let completed = 0;
	const count = filesToProcess.length;
	const logProgress = () =>
		process.stdout.write(`\r... (${completed} / ${count})`);
	logProgress();

	await Promise.all(
		filesToProcess.map(async f => {
			const fileCont = await fs.readFile(path.join(start, f), "utf-8");
			const { html, discord } = await processText(
				dirname(f).split("/"),
				fileCont
			);
			const discordfile = path.join(
				discorddist,
				f.replace(/\.dg$/, ".md")
			);
			const webfile = path.join(webdist, f.replace(/\.dg$/, ".html"));
			await fs.mkdir(dirname(discordfile), { recursive: true });
			await fs.mkdir(dirname(webfile), { recursive: true });
			await fs.writeFile(discordfile, discord, "utf-8");
			await fs.writeFile(
				webfile,
				htmlTemplate.replace("{{html|content}}", html),
				"utf-8"
			);
			completed++;
			logProgress();
		})
	);
	console.log();
})();
