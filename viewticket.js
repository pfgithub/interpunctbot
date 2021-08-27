let urlParams = new URLSearchParams(window.location.search);
fetch("https://cors.bridged.cc/"+encodeURI(urlParams.get("page"))).then(fr => fr.text()).then(txt => {
    document.write(txt);
}).catch(e => {
    console.log(e);
    document.body.appendChild(document.createTextNode("Got error: "+e.toString()));
});
