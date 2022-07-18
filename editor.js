document.addEventListener('DOMContentLoaded', () => {
    const svg_el = document.getElementById('map_svg');
    setTimeout(() => {
        const svg_doc = svg_el.getSVGDocument();
        const svg = svg_doc.getElementsByTagName('svg')[0];

        let mouse_down = false, selectedElement = null, mouse_offset = null;

        const mode_line_el = document.getElementById('mode_line')
        let mode = {
            NONE: 0,
            SELECTED: 1,
            DELETE: 2,
            CREATE_MULTI_SELECTOR: 3,
            ADD_LINE: 4,
            ADD_RECT: 5,
            USE_MULTI_SELECTOR: 6,
            SELECTED_LINE: 7,

            m_: this.NONE,
            set m(val) {
                this.m_ = val;
                mode_line_el.innerText = Object.keys(this).find(e => this[e] === this.m_).toString()
                console.log('Mode: ', this.m_, Object.keys(this).find(e => this[e] === this.m_).toString())
            },
            get m() {
                return this.m_;
            },

        }
        mode.m = mode.NONE;

        document.getElementById('delete_el_button').onclick = () => {
            if (!mouse_down) mode.m = mode.DELETE;
        }
        document.getElementById('multi_selector_button').onclick = () => {
            if (!mouse_down) mode.m = mode.CREATE_MULTI_SELECTOR;
        }
        document.getElementById('add_line_button').onclick = () => {
            if (!mouse_down) mode.m = mode.ADD_LINE;
        }
        document.getElementById('add_rect_button').onclick = () => {
            if (!mouse_down) mode.m = mode.ADD_RECT;
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

        function applyTransforms(pt, transforms) {
            let p = {x: pt.x, y: pt.y}
            for (const trans of transforms) {
                const matrix = trans.matrix;
                const xt = p.x, yt = p.y;
                p.x = xt * matrix.a + yt * matrix.b + matrix.e
                p.y = xt * matrix.c + yt * matrix.d + matrix.f
            }
            return p
        }

        function element_mover(element, mouse_pos) {
            const mouse_offset = Object.assign({}, mouse_pos);

            // Make sure the first transform on the element is a `translate` transform
            const transforms = element.transform.baseVal;

            if (transforms.length === 0 || transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) {
                // Create a transform that translates by (0, 0)
                const translate = svg.createSVGTransform();
                translate.setTranslate(0, 0);
                transforms.insertItemBefore(translate, 0);
            }

            // Get initial translation
            const transform = transforms.getItem(0);
            mouse_offset.x -= transform.matrix.e;
            mouse_offset.y -= transform.matrix.f;

            return (mouse_pos) => {
                transform.setTranslate(mouse_pos.x - mouse_offset.x, mouse_pos.y - mouse_offset.y);
            }
        }

        let select_mode = {
            el_: null, bounding_box_: null, circle_: null, clear() {
                this.el_ = null
                if (this.bounding_box_ !== null) this.bounding_box_.remove()
                if (this.circle_ !== null) this.circle_.remove()

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
                this.updaters = [element_mover(this.bounding_box_, mouse_offset), element_mover(this.el, mouse_offset), element_mover(this.circle_, mouse_offset)]
            }, drag(mouse_pos) {
                for (const updater of this.updaters) {
                    updater(mouse_pos);
                }
            }, endDrag(mouse_pos) {
                this.drag(mouse_pos)
            }
        }

        let line_select_mode = {
            el_: null, bounding_box_: null, circle_: null, c1_: null, c2_: null, clear() {
                this.el_ = null
                if (this.bounding_box_ !== null) this.bounding_box_.remove()
                if (this.circle_ !== null) this.circle_.remove()
                if (this.c1_ !== null) this.c1_.remove()
                if (this.c2_ !== null) this.c2_.remove()

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

                const cp1 = applyTransforms({
                    x: this.el_.getAttribute('x1'),
                    y: this.el_.getAttribute('y1')
                }, this.el_.transform.baseVal)
                const circle1 = svg_doc.createElementNS(svg.namespaceURI, "circle");
                circle1.setAttribute("cx", cp1.x.toString());
                circle1.setAttribute("cy", cp1.y.toString());
                circle1.setAttribute("r", "2");
                circle1.setAttribute("fill", "#0F0");
                circle1.setAttribute("fill-opacity", "1.0");
                circle1.setAttribute("stroke", "#000");
                circle1.setAttribute("stroke-width", "1");
                circle1.setAttribute("stroke-opacity", "0.6");
                circle1.classList.add("endpoint");
                svg.appendChild(circle1);
                this.c1_ = circle1;

                const cp2 = applyTransforms({
                    x: this.el_.getAttribute('x2'),
                    y: this.el_.getAttribute('y2')
                }, this.el_.transform.baseVal)
                const circle2 = svg_doc.createElementNS(svg.namespaceURI, "circle");
                circle2.setAttribute("cx", cp2.x.toString());
                circle2.setAttribute("cy", cp2.y.toString());
                circle2.setAttribute("r", "2");
                circle2.setAttribute("fill", "#0F0");
                circle2.setAttribute("fill-opacity", "1.0");
                circle2.setAttribute("stroke", "#000");
                circle2.setAttribute("stroke-width", "1");
                circle2.setAttribute("stroke-opacity", "0.6");
                circle2.classList.add("endpoint");

                svg.appendChild(circle2);
                this.c2_ = circle2;

            }, get el() {
                return this.el_;
            }, startDrag(mouse_offset) {
                this.updaters = [element_mover(this.bounding_box_, mouse_offset), element_mover(this.el_, mouse_offset), element_mover(this.circle_, mouse_offset), element_mover(this.c1_, mouse_offset), element_mover(this.c2_, mouse_offset)]
            }, drag(mouse_pos) {
                for (const updater of this.updaters) {
                    updater(mouse_pos);
                }
            }, endDrag(mouse_pos) {
                this.drag(mouse_pos)
            }
        }

        let multi_line_selector_mode = {
            rect_: null, circle_: null, circle2_: null, els_: [], clear() {
                if (this.rect_ !== null) {
                    this.rect_.remove()
                    this.circle_.remove()
                    this.circle2_.remove()
                }
                for (const el of this.els_) {
                    el.setAttribute('stroke', '#F00')
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
                rect.classList.add("selector_bb");

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

                const circle2 = svg_doc.createElementNS(svg.namespaceURI, "circle");
                circle2.setAttribute("cx", mouse_pos.x.toString());
                circle2.setAttribute("cy", mouse_pos.y.toString());
                circle2.setAttribute("r", "2");
                circle2.setAttribute("fill", "#00F");
                circle2.setAttribute("fill-opacity", "0.8");
                circle2.classList.add("selector_joiner");

                svg.appendChild(circle2);
                this.circle2_ = circle2;

            }, drag_create(mouse_pos) {
                this.rect_.setAttribute("x", (Math.min(mouse_pos.x, this.mouse_start.x)).toString());
                this.rect_.setAttribute("y", (Math.min(mouse_pos.y, this.mouse_start.y)).toString());
                this.rect_.setAttribute("width", Math.abs(mouse_pos.x - this.mouse_start.x).toString());
                this.rect_.setAttribute("height", Math.abs(mouse_pos.y - this.mouse_start.y).toString());

                this.circle_.setAttribute('cx', (Math.max(mouse_pos.x, this.mouse_start.x)).toString())
                this.circle_.setAttribute('cy', (Math.min(mouse_pos.y, this.mouse_start.y)).toString())

                this.circle2_.setAttribute('cx', (Math.min(mouse_pos.x, this.mouse_start.x)).toString())
                this.circle2_.setAttribute('cy', (Math.min(mouse_pos.y, this.mouse_start.y)).toString())
            }, end_create(mouse_pos) {
                this.drag_create((mouse_pos))
                const p1 = {x: Math.min(mouse_pos.x, this.mouse_start.x), y: Math.min(mouse_pos.y, this.mouse_start.y)}
                const p2 = {x: Math.max(mouse_pos.x, this.mouse_start.x), y: Math.max(mouse_pos.y, this.mouse_start.y)}

                for (const el of svg_doc.getElementsByClassName('item')) {
                    if (el.tagName === 'line') {
                        const x1 = el.getAttribute('x1')
                        const x2 = el.getAttribute('x2')
                        const y1 = el.getAttribute('y1')
                        const y2 = el.getAttribute('y2')
                        if ((p1.x <= x1) && (x1 <= p2.x) && (p1.x <= x2) && (x2 <= p2.x) && (p1.y <= y1) && (y1 <= p2.y) && (p1.y <= y2) && (y2 <= p2.y)) {
                            this.els_.push(el)
                            el.setAttribute('stroke', '#000')
                        }
                    }
                }
                console.log(this.els_)
            }, delete_els() {
                for (const el of this.els_) {
                    el.remove()
                }
                this.els_ = []
            }, join_lines() {
                if (this.els_.length === 0) {
                    this.clear()
                    return
                }

                if (this.els_.length === 1) {
                    const el = this.els_[0]
                    this.clear()
                    return el
                }

                // There are two directions of lines: does the smaller x have the smaller y or the larger y
                let dir = null;
                {
                    const el = this.els_[0];
                    const x1 = el.getAttribute('x1')
                    const x2 = el.getAttribute('x2')
                    const y1 = el.getAttribute('y1')
                    const y2 = el.getAttribute('y2')

                    if (((x1 <= x2) && (y1 <= y2)) || ((x1 > x2) && (y1 > y2))) dir = 1; else dir = -1;
                }
                let X1 = Number.POSITIVE_INFINITY
                let Y1 = Number.POSITIVE_INFINITY
                let X2 = Number.NEGATIVE_INFINITY
                let Y2 = Number.NEGATIVE_INFINITY

                for (const el of this.els_) {
                    const x1 = el.getAttribute('x1')
                    const x2 = el.getAttribute('x2')
                    const y1 = el.getAttribute('y1')
                    const y2 = el.getAttribute('y2')

                    if (x1 <= x2) {
                        X1 = Math.min(X1, x1)
                        X2 = Math.max(X2, x2)

                        if (dir === 1) {
                            Y1 = Math.min(Y1, y1)
                            Y2 = Math.max(Y2, y2)
                        } else {
                            Y1 = Math.min(Y1, y2)
                            Y2 = Math.max(Y2, y1)
                        }
                    } else {
                        X1 = Math.min(X1, x2)
                        X2 = Math.max(X2, x1)

                        if (dir === 1) {
                            Y1 = Math.min(Y1, y2)
                            Y2 = Math.max(Y2, y1)
                        } else {
                            Y1 = Math.min(Y1, y1)
                            Y2 = Math.max(Y2, y2)
                        }
                    }
                }

                const line = svg_doc.createElementNS(svg.namespaceURI, "line");
                line.setAttribute("x1", X1.toString());
                line.setAttribute("y1", Y1.toString());
                line.setAttribute("x2", X2.toString());
                line.setAttribute("y2", Y2.toString());
                line.setAttribute("stroke", "#F00");
                line.setAttribute("stroke-width", "3");
                line.classList.add("item");

                svg.appendChild(line);
                this.delete_els()
                this.clear()
                return line;
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

            }, drag(mouse_pos) {
                this.line_.setAttribute("x2", mouse_pos.x.toString());
                this.line_.setAttribute("y2", mouse_pos.y.toString());

            }, endDrag(mouse_pos) {
                this.drag(mouse_pos)
            }
        }

        let add_rect_mode = {
            rect_: null, clear() {
                if (this.rect_ !== null) {
                    this.rect_ = null
                }
            }, startDrag(mouse_pos) {
                this.clear()

                this.mouse_start = mouse_pos;
                const rect = svg_doc.createElementNS(svg.namespaceURI, "rect");
                rect.setAttribute("x", mouse_pos.x.toString());
                rect.setAttribute("y", mouse_pos.y.toString());
                rect.setAttribute("width", '1');
                rect.setAttribute("height", '1');
                rect.setAttribute("fill", "#F00");
                rect.setAttribute("fill-opacity", "1.0");
                rect.classList.add("item");

                svg.appendChild(rect);
                this.rect_ = rect;

            }, drag(mouse_pos) {
                this.rect_.setAttribute("x", (Math.min(mouse_pos.x, this.mouse_start.x)).toString());
                this.rect_.setAttribute("y", (Math.min(mouse_pos.y, this.mouse_start.y)).toString());
                this.rect_.setAttribute("width", Math.abs(mouse_pos.x - this.mouse_start.x).toString());
                this.rect_.setAttribute("height", Math.abs(mouse_pos.y - this.mouse_start.y).toString());
            }, endDrag(mouse_pos) {
                this.drag(mouse_pos)
            }
        }

        function startDrag(evt) {
            mouse_down = true;

            if (mode.m === mode.NONE) {
                console.log("none mode", mode.m)
                if (evt.target.classList.contains('item') || evt.target === multi_line_selector_mode.circle_) selectedElement = evt.target
            } else if (mode.m === mode.SELECTED) {
                if (evt.target === select_mode.bounding_box_) {
                    selectedElement = evt.target
                    mouse_offset = getMousePosition(evt);
                    select_mode.startDrag(mouse_offset);
                } else if (evt.target === select_mode.circle_) {
                    selectedElement = evt.target
                }
            } else if (mode.m === mode.SELECTED_LINE) {
                if (evt.target === line_select_mode.bounding_box_) {
                    selectedElement = evt.target
                    mouse_offset = getMousePosition(evt);
                    line_select_mode.startDrag(mouse_offset);
                } else if (evt.target === line_select_mode.circle_ || evt.target === line_select_mode.c1_ || evt.target === line_select_mode.c2_) {
                    selectedElement = evt.target
                }
            } else if (mode.m === mode.DELETE) {
                if (evt.target.classList.contains('item')) selectedElement = evt.target;
            } else if (mode.m === mode.CREATE_MULTI_SELECTOR) {
                multi_line_selector_mode.start_create(getMousePosition(evt))
            } else if (mode.m === mode.ADD_LINE) {
                add_line_mode.startDrag(getMousePosition(evt))
            } else if (mode.m === mode.ADD_RECT) {
                add_rect_mode.startDrag(getMousePosition(evt))
            } else if (mode.m === mode.USE_MULTI_SELECTOR) {
                if (evt.target === multi_line_selector_mode.circle_ || evt.target === multi_line_selector_mode.circle2_) {
                    selectedElement = evt.target
                }
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
                } else if (mode.m === mode.SELECTED_LINE) {
                    if (selectedElement === line_select_mode.bounding_box_) {
                        evt.preventDefault();
                        line_select_mode.drag(getMousePosition(evt))
                    }
                } else if (mode.m === mode.DELETE) {
                    // NOP
                } else if (mode.m === mode.CREATE_MULTI_SELECTOR) {
                    multi_line_selector_mode.drag_create(getMousePosition(evt))
                } else if (mode.m === mode.ADD_LINE) {
                    add_line_mode.drag(getMousePosition(evt))
                } else if (mode.m === mode.ADD_RECT) {
                    add_rect_mode.drag(getMousePosition(evt))
                }
            }
        }

        function endDrag(evt) {
            mouse_down = false;
            if (mode.m === mode.NONE) {
                if (selectedElement !== null) {
                    if (selectedElement.tagName === "line") {
                        mode.m = mode.SELECTED_LINE
                        line_select_mode.el = selectedElement;
                    } else {
                        mode.m = mode.SELECTED
                        select_mode.el = selectedElement;
                    }
                }
            } else if (mode.m === mode.SELECTED) {
                if (selectedElement === select_mode.bounding_box_) {
                    select_mode.endDrag(getMousePosition(evt))
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

            } else if (mode.m === mode.SELECTED_LINE) {
                if (selectedElement === line_select_mode.bounding_box_) {
                    line_select_mode.endDrag(getMousePosition(evt))
                    selectedElement = null;
                } else if (selectedElement === line_select_mode.circle_) {
                    if (evt.target === line_select_mode.circle_) {
                        line_select_mode.el.remove()
                        line_select_mode.clear()
                        mode.m = mode.NONE
                    }
                    selectedElement = null
                } else {
                    selectedElement = null;
                    line_select_mode.clear()
                    mode.m = mode.NONE
                }

            } else if (mode.m === mode.DELETE) {
                if (selectedElement !== null) {
                    selectedElement.remove();
                    selectedElement = null;
                }
                mode.m = mode.NONE;
            } else if (mode.m === mode.CREATE_MULTI_SELECTOR) {
                multi_line_selector_mode.end_create(getMousePosition(evt))
                mode.m = mode.USE_MULTI_SELECTOR
            } else if (mode.m === mode.ADD_LINE) {
                add_line_mode.endDrag(getMousePosition(evt))
                mode.m = mode.SELECTED
                select_mode.el = add_line_mode.line_
            } else if (mode.m === mode.ADD_RECT) {
                add_rect_mode.endDrag(getMousePosition(evt))
                add_rect_mode.clear()
                mode.m = mode.NONE
            } else if (mode.m === mode.USE_MULTI_SELECTOR) {
                if (evt.target === selectedElement) {
                    if (selectedElement === multi_line_selector_mode.circle_) {
                        multi_line_selector_mode.delete_els()
                        if (evt.target === multi_line_selector_mode.circle_) multi_line_selector_mode.clear();
                        mode.m = mode.NONE
                    } else if (selectedElement === multi_line_selector_mode.circle2_) {
                        mode.m = mode.SELECTED_LINE
                        line_select_mode.el = multi_line_selector_mode.join_lines()
                    }
                }
                if (selectedElement == null && evt.target !== multi_line_selector_mode.rect_) {
                    multi_line_selector_mode.clear()
                    mode.m = mode.NONE
                } else {
                    console.log(selectedElement)
                }
                selectedElement = null
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

    }, 200) // onLoad doesn't work for the object tag

}, false);