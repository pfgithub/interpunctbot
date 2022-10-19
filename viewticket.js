(() => {
    let urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get("page");
    const match = page.match(/^https:\/\/cdn.discordapp.com\/attachments\/([0-9]+?)\/([0-9]+?)\/log.html$/);
    if(!match) {
        document.write("Error; Bad link");
        return;
    }
    location.href = "https://interpunct-ticket-viewer.vercel.app/view_ticket?id1="+match[1]+"&id2="+match[2]+"";
})();