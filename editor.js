var a;
document.addEventListener('DOMContentLoaded', () => {
    const svg_el = document.getElementById('map_svg');
    setTimeout(() => {
        const svg_doc = svg_el.getSVGDocument();
        const svg = svg_doc.getElementsByTagName('svg')[0];

        let selectedElement = false, offset, transform, bbox, minX, maxX, minY, maxY, confined;

        const mode_line_el = document.getElementById('mode_line')
        let mode = {
            m_: 10, set m(val) {
                this.m_ = val;
                mode_line_el.innerText = this.m_
            }, get m() {
                return this.m_;
            }
        }
        mode.m = "move";
        document.getElementById('delete_el_button').onclick = () => mode.m = "delete";

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
            if (mode.m === 'delete' && evt.target.classList.contains('item')) {
                selectedElement = evt.target
            }

            if (mode.m === "move" && evt.target.classList.contains('item')) {
                selectedElement = evt.target;
                offset = getMousePosition(evt);

                // Make sure the first transform on the element is a translate transform
                const transforms = selectedElement.transform.baseVal;

                if (transforms.length === 0 || transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) {
                    // Create an transform that translates by (0, 0)
                    const translate = svg.createSVGTransform();
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
            if (mode.m === "delete" && selectedElement) return;

            if (mode.m === "move" && selectedElement) {
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
            if (mode.m === "delete") {
                selectedElement.remove();
                selectedElement = false;
                mode.m = "move";
            }

            if (mode.m === "move") {
                selectedElement = false;
            }
        }

        svg.addEventListener('mousedown', startDrag);
        svg.addEventListener('mousemove', drag);
        svg.addEventListener('mouseup', endDrag);
        svg.addEventListener('mouseleave', endDrag);
        svg.addEventListener('touchstart', startDrag);
        svg.addEventListener('touchmove', drag);
        svg.addEventListener('touchend', endDrag);
        svg.addEventListener('touchleave', endDrag);
        svg.addEventListener('touchcancel', endDrag);

    }, 200) // onLoad doesnt work for the object tag

}, false);