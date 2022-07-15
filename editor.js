var a;
document.addEventListener('DOMContentLoaded', () => {
    const svg_el = document.getElementById('map_svg');
    setTimeout(() => {
        const svg_doc = svg_el.getSVGDocument();
        const svg = svg_doc.getElementsByTagName('svg')[0];

        let mouse_down = false, selectedElement = null, mouse_offset = null, transform = null;

        const mode_line_el = document.getElementById('mode_line')
        let mode = {
            NONE: 0, SELECTED: 1, DELETE: 2,

            m_: this.NONE, set m(val) {
                this.m_ = val;
                mode_line_el.innerText = Object.keys(this).find(e => this[e] === this.m_).toString()
                console.log('Mode: ', this.m_, Object.keys(this).find(e => this[e] === this.m_).toString())
            }, get m() {
                return this.m_;
            },

        }
        mode.m = mode.NONE;
        document.getElementById('delete_el_button').onclick = () => mode.m = mode.DELETE;

        function getMousePosition(evt) {
            const CTM = svg.getScreenCTM();
            if (evt.touches) {
                evt = evt.touches[0];
            }
            return {
                x: (evt.clientX - CTM.e) / CTM.a, y: (evt.clientY - CTM.f) / CTM.d
            };
        }

        let select_mode = {
            el_: null, bounding_box_: null, clear() {
                console.log("Cleared", this.el_)
                this.el_ = null
                if (this.bounding_box_ !== null) {
                    this.bounding_box_.remove()
                }
            }, set el(val) {
                console.log("Selected", val)
                this.clear()
                this.el_ = val;

                // Setup bounding box
                const bb = this.el_.getBoundingClientRect();
                const screenToSVG = svg.getScreenCTM().inverse();

                const p = svg.createSVGPoint()
                p.x = bb.left
                p.y = bb.top
                const p1 = p.matrixTransform(screenToSVG);
                p.x = bb.right
                p.y = bb.bottom
                const p2 = p.matrixTransform(screenToSVG)

                const del = 5; // Pixels
                p1.x -= del
                p1.y -= del
                p2.x += del
                p2.y += del

                // Get width and height
                p2.x -= p1.x
                p2.y -= p1.y
                console.log(bb, p1, p2)
                console.log(val)


                const rect = svg_doc.createElementNS(svg.namespaceURI, "rect");
                rect.setAttribute("x", p1.x.toString());
                rect.setAttribute("y", p1.y.toString());
                rect.setAttribute("width", p2.x.toString());
                rect.setAttribute("height", p2.y.toString());
                rect.setAttribute("fill", "#5cceee");
                rect.setAttribute("fill-opacity", "0.1");
                rect.setAttribute("stroke", "green");
                rect.setAttribute("stroke-width", "1");
                rect.classList.add("selector");

                svg.appendChild(rect);
                this.bounding_box_ = rect;

            }, get el() {
                return this.el_;
            }
        }

        function startDrag(evt) {
            mouse_down = true;
            if (mode.m === mode.NONE) {
                console.log("none mode", mode.m)
                if (evt.target.classList.contains('item')) selectedElement = evt.target
            } else if (mode.m === mode.SELECTED) {
                console.log("SELECTED: Down", evt.target.classList)
                if (evt.target.classList.contains('selector')) {
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
                    transform = transforms.getItem(0);
                    mouse_offset.x -= transform.matrix.e;
                    mouse_offset.y -= transform.matrix.f;
                }
            } else if (mode.m === mode.DELETE) {
                if (evt.target.classList.contains('item')) selectedElement = evt.target;
            }

            /*if (mode.m === "move" && evt.target.classList.contains('item')) {
                selectedElement = evt.target;

            }*/
        }

        function drag(evt) {
            if (mouse_down) {
                if (mode.m === mode.NONE) {
                    if (selectedElement === null) console.log('Panning...');
                } else if (mode.m === mode.SELECTED) {
                    if (selectedElement !== null) {
                        console.log("SELECTED: Move")
                        evt.preventDefault();

                        var coord = getMousePosition(evt);
                        var dx = coord.x - mouse_offset.x;
                        var dy = coord.y - mouse_offset.y;

                        transform.setTranslate(dx, dy);
                    }
                } else if (mode.m === mode.DELETE) {
                    // NOP
                }
            }
        }

        function endDrag(evt) {
            mouse_down = false;
            if (mode.m === mode.NONE) {
                if (selectedElement !== null) {
                    mode.m = mode.SELECTED
                    console.log(selectedElement.getBoundingClientRect())
                    select_mode.el = selectedElement;
                }
            } else if (mode.m === mode.SELECTED) {
                console.log("SELECTED: up")
                if (selectedElement !== null) {
                    selectedElement = null;
                } else {
                    selectedElement = null;
                    transform = null;
                    select_mode.clear()
                    mode.m = mode.NONE
                }

            } else if (mode.m === mode.DELETE) {
                if (selectedElement !== null) {
                    selectedElement.remove();
                    selectedElement = null;
                }
                mode.m = mode.NONE;
            }

            /*if (mode.m === "move") {
            }*/
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