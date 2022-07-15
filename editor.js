var a;
document.addEventListener('DOMContentLoaded', () => {
    const svg_el = document.getElementById('map_svg');
    setTimeout(() => {
        const svg_doc = svg_el.getSVGDocument();
        const svg = svg_doc.getElementsByTagName('svg')[0];

        let mouse_down = false, selectedElement = null, mouse_offset = null, transform = null;

        const mode_line_el = document.getElementById('mode_line')
        let mode = {
            NONE: 0, SELECTED: 1, DELETE: 2, MULTI_SELECTOR: 3, ADD_LINE: 4,

            m_: this.NONE, set m(val) {
                this.m_ = val;
                mode_line_el.innerText = Object.keys(this).find(e => this[e] === this.m_).toString()
                console.log('Mode: ', this.m_, Object.keys(this).find(e => this[e] === this.m_).toString())
            }, get m() {
                return this.m_;
            },

        }
        mode.m = mode.NONE;

        document.getElementById('delete_el_button').onclick = () => {
            if (!mouse_down) mode.m = mode.DELETE;
        }
        document.getElementById('multi_selector_button').onclick = () => {
            if (!mouse_down) mode.m = mode.MULTI_SELECTOR;
        }
        document.getElementById('add_line_button').onclick = () => {
            if (!mouse_down) mode.m = mode.ADD_LINE;
        }

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

        let multi_selector_mode = {
            rect_: null, circle_: null, els_: [], clear() {
                if (this.rect_ !== null) {
                    this.rect_.remove()
                    this.circle_.remove()
                }
                this.els_ = []
            }, start_create(mouse_pos) {
                this.clear()

                this.mouse_start = mouse_pos;
                const rect = svg_doc.createElementNS(svg.namespaceURI, "rect");
                rect.setAttribute("x", mouse_pos.x.toString());
                rect.setAttribute("y", mouse_pos.y.toString());
                rect.setAttribute("width", '1');
                rect.setAttribute("height", '1');
                rect.setAttribute("fill", "#5cceee");
                rect.setAttribute("fill-opacity", "0.1");
                rect.setAttribute("stroke", "green");
                rect.setAttribute("stroke-width", "1");
                rect.classList.add("multiselector");

                svg.appendChild(rect);
                this.rect_ = rect;

                const circle = svg_doc.createElementNS(svg.namespaceURI, "circle");
                circle.setAttribute("cx", mouse_pos.x.toString());
                circle.setAttribute("cy", mouse_pos.y.toString());
                circle.setAttribute("r", "2");
                circle.setAttribute("fill", "#000");
                circle.setAttribute("fill-opacity", "0.8");
                circle.classList.add("selector_closer");

                svg.appendChild(circle);
                this.circle_ = circle;

            }, drag_create(mouse_pos) {
                this.rect_.setAttribute("x", (Math.min(mouse_pos.x, this.mouse_start.x)).toString());
                this.rect_.setAttribute("y", (Math.min(mouse_pos.y, this.mouse_start.y)).toString());
                this.rect_.setAttribute("width", Math.abs(mouse_pos.x - this.mouse_start.x).toString());
                this.rect_.setAttribute("height", Math.abs(mouse_pos.y - this.mouse_start.y).toString());

                this.circle_.setAttribute('cx', (Math.max(mouse_pos.x, this.mouse_start.x)).toString())
                this.circle_.setAttribute('cy', (Math.min(mouse_pos.y, this.mouse_start.y)).toString())
            }, end_create(mouse_pos) {
                this.drag_create((mouse_pos))
                this.p1 = {x: Math.min(mouse_pos.x, this.mouse_start.x), y: Math.min(mouse_pos.y, this.mouse_start.y)}
                this.p2 = {x: Math.max(mouse_pos.x, this.mouse_start.x), y: Math.max(mouse_pos.y, this.mouse_start.y)}

                // svg_doc.getElementsByClassName('item').forEach((el) => {
                //     el.getBounds()
                // })
            }
        }

        let add_line_mode = {
            line_: null, clear() {
                if (this.line_ !== null) {
                    this.line_ = null
                }
            }, startDrag(mouse_pos) {
                this.clear()

                const line = svg_doc.createElementNS(svg.namespaceURI, "line");
                line.setAttribute("x1", mouse_pos.x.toString());
                line.setAttribute("y1", mouse_pos.y.toString());
                line.setAttribute("x2", mouse_pos.x.toString());
                line.setAttribute("y2", mouse_pos.y.toString());
                line.setAttribute("stroke", "#F00");
                line.setAttribute("stroke-width", "3");
                line.classList.add("item");

                svg.appendChild(line);
                this.line_ = line;
                console.log(mouse_pos)

            }, drag(mouse_pos) {
                this.line_.setAttribute("x2", mouse_pos.x.toString());
                this.line_.setAttribute("y2", mouse_pos.y.toString());

            }, endDrag(mouse_pos) {
                console.log(mouse_pos)
                this.drag(mouse_pos)
            }
        }

        function startDrag(evt) {
            mouse_down = true;

            if (mode.m === mode.NONE) {
                console.log("none mode", mode.m)
                if (evt.target.classList.contains('item') || evt.target === multi_selector_mode.circle_) selectedElement = evt.target
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
            } else if (mode.m === mode.MULTI_SELECTOR) {
                multi_selector_mode.start_create(getMousePosition(evt))
            } else if (mode.m === mode.ADD_LINE) {
                add_line_mode.startDrag(getMousePosition(evt))
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
                } else if (mode.m === mode.MULTI_SELECTOR) {
                    multi_selector_mode.drag_create(getMousePosition(evt))
                } else if (mode.m === mode.ADD_LINE) {
                    add_line_mode.drag(getMousePosition(evt))
                }
            }
        }

        function endDrag(evt) {
            mouse_down = false;
            if (mode.m === mode.NONE) {
                if (selectedElement === multi_selector_mode.circle_) {
                    if (evt.target === multi_selector_mode.circle_) multi_selector_mode.clear();
                } else if (selectedElement !== null) {
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
            } else if (mode.m === mode.MULTI_SELECTOR) {
                multi_selector_mode.end_create(getMousePosition(evt))
                mode.m = mode.NONE
            } else if (mode.m === mode.ADD_LINE) {
                add_line_mode.endDrag(getMousePosition(evt))
                mode.m = mode.SELECTED
                select_mode.el = add_line_mode.line_
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