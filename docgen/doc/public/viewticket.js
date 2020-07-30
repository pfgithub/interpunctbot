let urlParams = new URLSearchParams(window.location.search);
fetch("https://cors-anywhere.herokuapp.com/"+encodeURI(urlParams.get("page"))).then((fr) => {
	fr.text().then(txt => {
		document.write(txt);
	});
})