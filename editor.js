var a;
document.addEventListener('DOMContentLoaded', () => {
    const svg_el = document.getElementById('map_svg');
    setTimeout(() => {
        const svg_doc = svg_el.getSVGDocument();
        const svg = svg_doc.getElementsByTagName('svg')[0];

        let selectedElement = false, mouse_offset = null, transform = null;

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
                mouse_offset = getMousePosition(evt);

                // Make sure the first transform on the element is a translate transform
                transforms = selectedElement.transform.baseVal;

                if (transforms.length === 0 || transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) {
                    // Create an transform that translates by (0, 0)
                    const translate = svg.createSVGTransform();
                    translate.setTranslate(0, 0);
                    selectedElement.transform.baseVal.insertItemBefore(translate, 0);
                }

                // Get initial translation
                const transform = transforms.getItem(0);
                mouse_offset.x -= transform.matrix.e;
                mouse_offset.y -= transform.matrix.f;
            }
        }

        function drag(evt) {
            if (mode.m === "delete" && selectedElement) return;

            if (mode.m === "move" && selectedElement) {
                evt.preventDefault();

                var coord = getMousePosition(evt);
                var dx = coord.x - mouse_offset.x;
                var dy = coord.y - mouse_offset.y;

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