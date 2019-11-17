const linksToInline = Array.from(document.querySelectorAll("a[inline=true]"));
linksToInline.forEach(async link => {
	const content = await (await fetch(link.href)).text();
	let contentMatch = content.match(
		/<!-- CONTENT STARTS HERE -->[\S\s]*<!-- CONTENT ENDS HERE -->/
	)[0];
	contentMatch = contentMatch.replace(
		/<(\/?h)([1-6])>/g,
		(v, a, b) => `<${a}${+b + 1}>`
	);
	const bqc = document.createElement("div");
	bqc.classList.add("blockquote-container");
	const bqd = document.createElement("div");
	bqd.classList.add("blockquote-divider");
	bqc.appendChild(bqd);
	const bq = document.createElement("blockquote");
	bq.innerHTML = contentMatch;
	bqc.appendChild(bq);
	link.parentNode.replaceChild(bqc, link); // unfortunately makes things pop in
});

const showSidebar = document.querySelector("button.showsidebar");
showSidebar.addEventListener("click", () =>
	document.querySelector(".sidebar").classList.add("shown")
);

const clickaway = document.querySelector(".clickaway");
clickaway.addEventListener("click", () =>
	document.querySelector(".sidebar").classList.remove("shown")
);
