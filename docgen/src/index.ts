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

export const html = templateGenerator((v: string) => htmlMD(escapeHTML(v)));

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
			htmlResult.push(
				html`
					<h2>${v}</h2>
				`
			);
			discordResult.push(`**${v}**`);
			continue;
		}
		if (line.startsWith("*text*: ")) {
			const v = line.substr(8);
			htmlResult.push(
				html`
					<p>${v}</p>
				`
			);
			discordResult.push(v);
			continue;
		}
		if (line.startsWith("*link*: ")) {
			const v = line.substring(19 + 1, line.length - 1);
			htmlResult.push(
				html`
					<p><a href="/${[...path, v].join("/")}">${v}</a></p>
				`
			);
			discordResult.push(`\`ip!${[...path, v].join(" ")}\``);
			continue;
		}
		if (line.startsWith("*link web=inline*: ")) {
			const v = line.substring(19 + 1, line.length - 1);
			htmlResult.push(
				html`
					<p>
						<a inline="true" href="/${[...path, v].join("/")}"
							>${v}</a
						>
					</p>
				`
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

function category(name: string) {
	return html`
		<div class="category">
			<svg
				class="category-collapse"
				width="24"
				height="24"
				viewBox="0 0 24 24"
			>
				<path
					fill="currentColor"
					fill-rule="evenodd"
					clip-rule="evenodd"
					d="M16.59 8.59004L12 13.17L7.41 8.59004L6 10L12 16L18 10L16.59 8.59004Z"
				></path>
			</svg>
			<header class="category-name">
				${name}
			</header>
		</div>
	`;
}

function channel(name: string, url: string) {
	return html`
		<a class="channel" href="${url}">
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				class="channel-icon"
			>
				<path
					fill="currentColor"
					fill-rule="evenodd"
					clip-rule="evenodd"
					d="M5.88657 21C5.57547 21 5.3399 20.7189 5.39427 20.4126L6.00001 17H2.59511C2.28449 17 2.04905 16.7198 2.10259 16.4138L2.27759 15.4138C2.31946 15.1746 2.52722 15 2.77011 15H6.35001L7.41001 9H4.00511C3.69449 9 3.45905 8.71977 3.51259 8.41381L3.68759 7.41381C3.72946 7.17456 3.93722 7 4.18011 7H7.76001L8.39677 3.41262C8.43914 3.17391 8.64664 3 8.88907 3H9.87344C10.1845 3 10.4201 3.28107 10.3657 3.58738L9.76001 7H15.76L16.3968 3.41262C16.4391 3.17391 16.6466 3 16.8891 3H17.8734C18.1845 3 18.4201 3.28107 18.3657 3.58738L17.76 7H21.1649C21.4755 7 21.711 7.28023 21.6574 7.58619L21.4824 8.58619C21.4406 8.82544 21.2328 9 20.9899 9H17.41L16.35 15H19.7549C20.0655 15 20.301 15.2802 20.2474 15.5862L20.0724 16.5862C20.0306 16.8254 19.8228 17 19.5799 17H16L15.3632 20.5874C15.3209 20.8261 15.1134 21 14.8709 21H13.8866C13.5755 21 13.3399 20.7189 13.3943 20.4126L14 17H8.00001L7.36325 20.5874C7.32088 20.8261 7.11337 21 6.87094 21H5.88657ZM9.41045 9L8.35045 15H14.3504L15.4104 9H9.41045Z"
				></path>
			</svg>
			<div class="channel-name">${name.toLowerCase()}</div>
		</a>
	`;
}

function sidebar(...items: string[]) {
	return html`
		<div
			tabindex="0"
			class="container-2Rl01u clickable-2ap7je hasBanner-14PPlG bannerVisible-14J9lQ"
			aria-controls="popout_48642"
			aria-expanded="false"
			role="button"
		>
			<header class="header-2o-2hj">
				<div class="guildIconContainer-E1JUVt"></div>
				<h1 class="name-3YKhmS">inter·punct bot</h1>
				<svg
					class="icon-WnO6o2"
					width="24"
					height="24"
					viewBox="0 0 24 24"
				>
					<path
						fill="currentColor"
						fill-rule="evenodd"
						clip-rule="evenodd"
						d="M16.59 8.59004L12 13.17L7.41 8.59004L6 10L12 16L18 10L16.59 8.59004Z"
					></path>
				</svg>
			</header>
			<div
				class="server-banner"
				style="opacity: 1; transform: translateY(0px);"
			>
				<div
					class="server-banner-image"
					style='background-image: url("https://cdn.discordapp.com/icons/446481361692524545/3e6a4d43d6a9aebe3fde441190fb6cb1.webp"); transform: translateY(0px) scale(1); background-position: center center; background-size: 50%; background-color: rgb(239, 71, 71);'
				></div>
			</div>
		</div>
		${raw(items.join("\n"))}
	`;
}

(async () => {
	const start = path.join(__dirname, "../doc/content");
	try {
		await fs.rmdir(path.join(__dirname, "../dist"), { recursive: true });
	} catch (e) {}
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
				htmlTemplate
					.replace("{{html|content}}", html)
					.replace(
						"{{html|sidebar}}",
						sidebar(
							category("help"),
							channel("channels", "/help/channels")
						)
					),
				"utf-8"
			);
			completed++;
			logProgress();
		})
	);
	console.log();
})();
