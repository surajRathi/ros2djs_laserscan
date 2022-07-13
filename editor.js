document.addEventListener('DOMContentLoaded', () => {
    const svg_el = document.getElementById('map_svg');
    // console.log(svg_el);
    setTimeout(() => {
        const svg_doc = svg_el.getSVGDocument();

        // console.log(svg_doc);
        console.log(svg_doc.getElementsByTagName('line'));
    }, 200) // onLoad doesnt work for the object tag

}, false);
