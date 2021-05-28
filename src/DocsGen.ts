import { globalDocs } from "./NewRouter";
import { promises as fs } from "fs";
import path from "path";
import { dgToHTML, safehtml, dgToMD } from "./parseDiscordDG";
import { raw } from "../messages";
import htmlMinifier from "html-minifier";

const mkpath = (...initial: string[]) => {
	return (...more: string[]) => path.join(...initial, ...more);
};

function category(name: string, link: string, active: boolean) {
	return safehtml`
    <a class="category${active ? " active" : ""}" href="${link}">
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
    </a>
`;
}

function channel(name: string, url: string, active: boolean) {
	return safehtml`
    <a class="channel${active ? " active" : ""}" href="${url}">
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

function sidebar(
	thisurl: string,
	json: [string, string, string | undefined][],
) {
	const items: string[] = [];
	json.forEach(([type, link, name]) => {
		if (!name) name = path.basename(link);
		if (type === "category") {
			items.push(category(name, link, thisurl === link));
		}
		if (type === "channel") {
			items.push(channel(name, link, thisurl === link));
		}
	});
	return safehtml`
    <div class="banner">
        <a class="banner-header" href="/">
            <div class="banner-icon"></div>
            <h1 class="banner-name">inter·punct bot</h1>
            <svg
                class="banner-dropdown"
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
        </a>
        <div
            class="banner-image-container"
            style="opacity: 1; transform: translateY(0px);"
        >
            <div
                class="banner-image"
                style='background-image: url("/logo.png"); background-image: url("/logo.svg"); transform: translateY(0px) scale(1); background-position: center center; background-size: 50%; background-color: rgb(239, 71, 71);'
            ></div>
        </div>
    </div>
    <div class="scroll-container">
        <div style="width: 100%; height: 84px; visibility: hidden;"></div>
        <div style="height: 16px;"></div>
        ${raw(items.join(" "))}
        <div style="height: 16px;"></div>
    </div>
`;
}

async function recursiveReaddir(start: string): Promise<string[]> {
	const files = await fs.readdir(start);
	const finalFiles: string[] = [];
	await Promise.all(
		files.map(async f => {
			const fileStats = await fs.stat(path.join(start, f));
			if (fileStats.isDirectory()) {
				finalFiles.push(
					...(await recursiveReaddir(path.join(start, f))).map(r =>
						path.join(f, r),
					),
				);
			} else {
				finalFiles.push(f);
			}
		}),
	);
	return finalFiles;
}

const dirname = (fullpath: string) =>
	fullpath.substr(0, fullpath.lastIndexOf("/"));

async function copyFolder(dir: string, to: string) {
	const filesToCopy = await recursiveReaddir(dir);
	for (const fileToCopy of filesToCopy) {
		await fs.mkdir(path.join(to, dirname(fileToCopy)), {
			recursive: true,
		});
		await fs.copyFile(
			path.join(dir, fileToCopy),
			path.join(to, fileToCopy),
		);
	}
}

const fRoot = mkpath(process.cwd());
const fDocs = mkpath(fRoot("docs"));
const fDocgen = mkpath(fRoot("docgen"));
const fDoc = mkpath(fDocgen("doc"));

export async function DocsGen() {
	try {
		await fs.rmdir(fDocs(), { recursive: true });
	} catch (e) {
		console.log(
			"Remove docs dir failed. Maybe it does not exist or the node version is <13?",
		);
		console.log(e);
	}
	await fs.mkdir(dirname(fDocs()), { recursive: true });
	await copyFolder(fDoc("public"), fDocs());
	await copyFolder(fDoc("public2"), fDocs());

	const htmlTemplate = await fs.readFile(fDoc("template.html"), "utf-8");

	const sidebarJSON = await fs.readFile(fDoc("sidebar.json"), "utf-8");
	const sidebarCont = JSON.parse(sidebarJSON);

	{
		const topggEntry = globalDocs["/help"];
		const tggText = dgToMD(topggEntry.body);
		if (tggText.length < 300)
			throw new Error(
				"Top.gg text must be at least 300 characters in length",
			);
		const file = fDocs("topgg.md");
		await fs.writeFile(file, tggText, "utf-8");
	}

	for (const docItem of Object.values(globalDocs)) {
		const html = dgToHTML(docItem.body, docItem.path);

		const sidebart = sidebar(docItem.path, sidebarCont);
		const webfile = fDocs(docItem.path + ".html");
		const pagetitle = docItem.path.substr(
			docItem.path.lastIndexOf("/") + 1,
		);
		const navbar =
			'<div class="navlinks">' +
			docItem.path
			    .split("/")
			    .map((q, i, a) => {
			        // if (!q) return "";
			        let current = false;
			        if (i === a.length - 1) current = true;
			        if (!q) return;
			        const title = q || "home";
			        return safehtml`/<a href="${a.slice(0, i + 1).join("/") ||
						"/"}" class="${
						current ? "navitem current" : "navitem"
			        }">${title}</a>`;
			    })
			    .join("") +
			"</div>";
		await fs.mkdir(dirname(webfile), { recursive: true });
		await fs.writeFile(
			webfile,
			htmlMinifier.minify(
				htmlTemplate.replace(/{html\|(.+?)}/g, (a, txt) => {
					if (txt === "content") return html;
					if (txt === "navbar") return navbar;
					if (txt === "sidebar") return sidebart;
					if (txt === "pagetitle") return pagetitle;
					if (txt === "stylesheet")
						return `<link rel="stylesheet" href="/style.css" />`;
					return a;
				}),
				{
					collapseWhitespace: false,
				},
			),
			"utf-8",
		);

		// console.log("  Generated HTML " + docItem.path);
	}
	console.log("Done");
}
