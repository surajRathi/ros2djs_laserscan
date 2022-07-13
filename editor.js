document.addEventListener('DOMContentLoaded', () => {
    const svg_el = document.getElementById('map_svg');
    // console.log(svg_el);
    setTimeout(() => {
        const svg_doc = svg_el.getSVGDocument();
        const svg = svg_doc.getElementsByTagName('svg')[0];
        // console.log(svg_doc);
        console.log(svg_doc.getElementsByTagName('line'));
        console.log(svg);

        let selectedElement = false, offset, transform, bbox, minX, maxX, minY, maxY, confined;

        function getMousePosition(evt) {
            const CTM = svg.getScreenCTM();
            if (evt.touches) {
                evt = evt.touches[0];
            }
            return {
                x: (evt.clientX - CTM.e) / CTM.a, y: (evt.clientY - CTM.f) / CTM.d
            };
        }


        function startDrag(evt) {
            if (evt.target.classList.contains('obstacles')) {

                selectedElement = evt.target;
                offset = getMousePosition(evt);

                // Make sure the first transform on the element is a translate transform
                const transforms = selectedElement.transform.baseVal;

                if (transforms.length === 0 || transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) {
                    // Create an transform that translates by (0, 0)
                    var translate = svg.createSVGTransform();
                    translate.setTranslate(0, 0);
                    selectedElement.transform.baseVal.insertItemBefore(translate, 0);
                }

                // Get initial translation
                transform = transforms.getItem(0);
                offset.x -= transform.matrix.e;
                offset.y -= transform.matrix.f;

                confined = evt.target.classList.contains('confine');
                if (confined) {
                    bbox = selectedElement.getBBox();
                    minX = boundaryX1 - bbox.x;
                    maxX = boundaryX2 - bbox.x - bbox.width;
                    minY = boundaryY1 - bbox.y;
                    maxY = boundaryY2 - bbox.y - bbox.height;
                }
            }
        }

        function drag(evt) {

            if (selectedElement) {
                evt.preventDefault();

                var coord = getMousePosition(evt);
                var dx = coord.x - offset.x;
                var dy = coord.y - offset.y;

                if (confined) {
                    if (dx < minX) {
                        dx = minX;
                    } else if (dx > maxX) {
                        dx = maxX;
                    }
                    if (dy < minY) {
                        dy = minY;
                    } else if (dy > maxY) {
                        dy = maxY;
                    }
                }

                transform.setTranslate(dx, dy);
            }
        }

        function endDrag(evt) {
            selectedElement = false;
        }

        svg.addEventListener('mousedown', startDrag);
        svg.addEventListener('mousemove', drag);
        svg.addEventListener('mouseup', endDrag);
        svg.addEventListener('mouseleave', endDrag);
    }, 200) // onLoad doesnt work for the object tag

}, false);