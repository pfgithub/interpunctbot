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

function scale(x, a, b, c, d) {
	return ((d - c) / (b - a)) * (x - a) + c;
}

const sidebar = document.querySelector(".scroll-container");
const bannerimgcont = document.querySelector(".banner-image-container");
const bannerimg = document.querySelector(".banner-image");
const bannerheader = document.querySelector(".banner-header");
sidebar.addEventListener("scroll", () => {
	const h = sidebar.scrollTop;
	const hv = Math.max(0, Math.min(h, 87));
	bannerimgcont.style.transform = `translateY(${-hv}px)`;
	bannerimgcont.style.opacity = scale(hv, 0, 87, 1, 0);
	bannerimg.style.transform = `translateY(${hv / 2}px) scale(${scale(
		hv,
		0,
		87,
		1,
		1.2
	)})`; // scale goes from 1 to 1.2
	bannerheader.classList.remove("shadow");
	if (hv === 87) {
		bannerheader.classList.add("shadow");
	}
});
