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
            el_: null, bounding_box_: null, circle_: null, clear() {
                this.el_ = null
                if (this.bounding_box_ !== null) {
                    this.bounding_box_.remove()
                    this.circle_.remove()
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

                let pc = svg.createSVGPoint()
                pc.x = bb.right
                pc.y = bb.top
                pc = pc.matrixTransform(screenToSVG);
                pc.x += del
                pc.y -= del

                const circle = svg_doc.createElementNS(svg.namespaceURI, "circle");
                circle.setAttribute("cx", pc.x.toString());
                circle.setAttribute("cy", pc.y.toString());
                circle.setAttribute("r", "2");
                circle.setAttribute("fill", "#000");
                circle.setAttribute("fill-opacity", "0.8");
                circle.classList.add("selector_closer");

                svg.appendChild(circle);
                this.circle_ = circle;

            }, get el() {
                return this.el_;
            }, startDrag(mouse_offset) {
                this.bb_mouse_offset_ = mouse_offset
                this.el_mouse_offset_ = Object.assign({}, mouse_offset); // THIS IS A SHALLOW COPY!! ; For a Deep Copy: (relatively new) structuredClone(mouse_offset)
                this.c_mouse_offset_ = Object.assign({}, mouse_offset); // THIS IS A SHALLOW COPY!! ; For a Deep Copy: (relatively new) structuredClone(mouse_offset)

                // Make sure the first transform on the element is a translate transform
                const transforms = this.bounding_box_.transform.baseVal;

                if (transforms.length === 0 || transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) {
                    // Create an transform that translates by (0, 0)
                    const translate = svg.createSVGTransform();
                    translate.setTranslate(0, 0);
                    transforms.insertItemBefore(translate, 0);
                }

                // Get initial translation
                this.bb_transform_ = transforms.getItem(0);
                this.bb_mouse_offset_.x -= this.bb_transform_.matrix.e;
                this.bb_mouse_offset_.y -= this.bb_transform_.matrix.f;

                const el_transforms = this.el_.transform.baseVal;
                if (el_transforms.length === 0 || el_transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) {
                    // Create an transform that translates by (0, 0)
                    const translate = svg.createSVGTransform();
                    translate.setTranslate(0, 0);
                    el_transforms.insertItemBefore(translate, 0);
                }
                this.el_transform_ = el_transforms.getItem(0);
                this.el_mouse_offset_.x -= this.el_transform_.matrix.e;
                this.el_mouse_offset_.y -= this.el_transform_.matrix.f;

                const c_transforms = this.circle_.transform.baseVal;
                if (c_transforms.length === 0 || c_transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) {
                    // Create an transform that translates by (0, 0)
                    const translate = svg.createSVGTransform();
                    translate.setTranslate(0, 0);
                    c_transforms.insertItemBefore(translate, 0);
                }
                this.c_transform_ = c_transforms.getItem(0);
                this.c_mouse_offset_.x -= this.c_transform_.matrix.e;
                this.c_mouse_offset_.y -= this.c_transform_.matrix.f;
            }, drag(mouse_pos) {
                this.bb_transform_.setTranslate(mouse_pos.x - this.bb_mouse_offset_.x, mouse_pos.y - this.bb_mouse_offset_.y);
                this.el_transform_.setTranslate(mouse_pos.x - this.el_mouse_offset_.x, mouse_pos.y - this.el_mouse_offset_.y);
                this.c_transform_.setTranslate(mouse_pos.x - this.c_mouse_offset_.x, mouse_pos.y - this.c_mouse_offset_.y);
            }, endDrag() {
                this.transform_ = null;
                this.el_transform_ = null;
                this.c_transform_ = null;
                this.bb_mouse_offset_ = null;
                this.el_mouse_offset_ = null;
                this.c_mouse_offset_ = null;
            }
        }

        function startDrag(evt) {
            mouse_down = true;

            if (mode.m === mode.NONE) {
                console.log("none mode", mode.m)
                if (evt.target.classList.contains('item')) selectedElement = evt.target
            } else if (mode.m === mode.SELECTED) {
                if (evt.target === select_mode.circle_) {
                    selectedElement = evt.target
                } else if (evt.target === select_mode.bounding_box_) {
                    selectedElement = evt.target
                    mouse_offset = getMousePosition(evt);
                    select_mode.startDrag(mouse_offset);
                }
            } else if (mode.m === mode.DELETE) {
                if (evt.target.classList.contains('item')) selectedElement = evt.target;
            }
        }

        function drag(evt) {
            if (mouse_down) {
                if (mode.m === mode.NONE) {
                    if (selectedElement === null) console.log('Panning...');
                } else if (mode.m === mode.SELECTED) {
                    if (selectedElement === select_mode.bounding_box_) {
                        evt.preventDefault();
                        select_mode.drag(getMousePosition(evt))
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
                    select_mode.el = selectedElement;
                }
            } else if (mode.m === mode.SELECTED) {
                if (selectedElement === select_mode.bounding_box_) {
                    select_mode.endDrag()
                    selectedElement = null;
                } else if (selectedElement === select_mode.circle_) {
                    if (evt.target === select_mode.circle_) {
                        select_mode.el.remove()
                        select_mode.clear()
                        mode.m = mode.NONE
                    }
                    selectedElement = null
                } else {
                    selectedElement = null;
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