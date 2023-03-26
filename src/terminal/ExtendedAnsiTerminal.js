const { AnsiTerminal, TScreen } = require('node-ansiterminal');

class ExtendedAnsiTerminal extends AnsiTerminal {
  serialize() {
    const serialized = {
      screen: this.screen.serialize(),
      normal_screen: this.normal_screen.serialize(),
      alternate_screen: this.alternate_screen.serialize(),
      cursor: this.cursor,
      normal_cursor: this.normal_cursor,
      alternate_cursor: this.alternate_cursor,
      textattributes: this.textattributes,
      colors: this.colors,
      charattributes: this.charattributes,
      reverse_video: this.reverse_video,
      cursor_key_mode: this.cursor_key_mode,
      show_cursor: this.show_cursor,
      title: this.title,
      cursor_save: this.cursor_save,
      insert_mode: this.insert_mode,
      blinking_cursor: this.blinking_cursor,
      scrolling_top: this.scrolling_top,
      scrolling_bottom: this.scrolling_bottom,
      autowrap: this.autowrap,
      newline_mode: this.newline_mode,
      tab_width: this.tab_width,
      last_char: this.last_char,
      mouse_mode: this.mouse_mode,
      mouse_protocol: this.mouse_protocol,
      mouseDown: this.mouseDown,
      _rem_c: this._rem_c,
      wrap: this.wrap,
      row_wrap: this.row_wrap,
      G0: this.G0,
      G1: this.G1,
      active_charset: this.active_charset,
      reflow: this.reflow,
    };
    return serialized;
  }

  // this is neccessary. don't worry about it
  inst_c(collected, params, flag) {
    if (flag != 'b')        // hack for getting REP working
        this.last_char = '';
    if (flag !== 'S' && flag !== 'T') { // FIXME: all but SD/SU reset wrap -> bug in xterm?
        this._rem_c = '';
        this.wrap = false;
    }
    switch (collected) {
        case '':
            switch (flag) {
                case '@':  return this.ICH(params);
                case 'E':  return this.CNL(params);
                case 'F':  return this.CPL(params);
                case 'G':  return this.CHA(params);
                case 'D':  return this.CUB(params);
                case 'B':  return this.CUD(params);
                case 'C':  return this.CUF(params);
                case 'A':  return this.CUU(params);
                case 'I':  return this.CHT(params);
                case 'Z':  return this.CBT(params);
                case 'f':
                case 'H':  return this.CUP(params);
                case 'P':  return this.DCH(params);
                case 'J':  return this.ED(params);
                case 'K':  return this.EL(params);
                case 'L':  return this.IL(params);
                case 'M':  return this.DL(params);
                case 'S':  return this.SU(params);
                case 'T':  return this.SD(params);
                case 'X':  return this.ECH(params);
                case 'a':  return this.HPR(params);
                case 'b':  return this.REP(params);
                case 'e':  return this.VPR(params);
                case 'd':  return this.VPA(params);
                case 'c':  return this.send(TERM_STRING['CSI'] + '?64;1;2;6;9;15;18;21;22c');  // DA1 TODO: DA1 function
                case 'h':  return this.high(collected, params);
                case 'l':  return this.low(collected, params);
                case 'm':  return this.SGR(params);
                case 'n':  return this.DSR(collected, params);
                case 'r':  return this.DECSTBM(params);
                case 's':  return this.DECSC();
                case 'u':  return this.DECRC();
                case 'z':  return null;
                case '`':  return this.HPA(params);
                default :
                    console.log('inst_c unhandled:', collected, params, flag);
            }
            break;
        case '?':
            switch (flag) {
                case 'J':  return this.ED(params);  // DECSED as normal ED
                case 'K':  return this.EL(params);  // DECSEL as normal EL
                case 'h':  return this.high(collected, params);
                case 'l':  return this.low(collected, params);
                case 'n':  return this.DSR(collected, params);
                default :
                    console.log('inst_c unhandled:', collected, params, flag);
            }
            break;
        case '>':
            switch (flag) {
                case 'c':  return this.send(TERM_STRING['CSI'] + '>41;1;0c');  // DA2
                default :
                    console.log('inst_c unhandled:', collected, params, flag);
            }
            break;
        case '!':
            switch (flag) {
                case 'p':  return this.DECSTR();
                default :
                    console.log('inst_c unhandled:', collected, params, flag);
            }
            break;
        default :
            console.log('inst_c unhandled:', collected, params, flag);
      }
    }

  static deserialize(serialized) {
    const { cols = 80, rows = 24 } = serialized?.screen ?? {};
    const term = new ExtendedAnsiTerminal(cols, rows, serialized?.screen?.scrollLength ?? 0);
    term.reset();
    if (!serialized) {
      return term;
    }
    term.screen = TScreen.deserialize(serialized.screen);
    term.normal_screen = TScreen.deserialize(serialized.normal_screen);
    term.alternate_screen = TScreen.deserialize(serialized.alternate_screen);
    term.cursor = serialized.cursor;
    term.normal_cursor = serialized.normal_cursor;
    term.alternate_cursor = serialized.alternate_cursor;
    term.textattributes = serialized.textattributes;
    term.colors = serialized.colors;
    term.charattributes = serialized.charattributes;
    term.reverse_video = serialized.reverse_video;
    term.cursor_key_mode = serialized.cursor_key_mode;
    term.show_cursor = serialized.show_cursor;
    term.title = serialized.title;
    term.cursor_save = serialized.cursor_save;
    term.insert_mode = serialized.insert_mode;
    term.blinking_cursor = serialized.blinking_cursor;
    term.scrolling_top = serialized.scrolling_top;
    term.scrolling_bottom = serialized.scrolling_bottom;
    term.autowrap = serialized.autowrap;
    term.newline_mode = serialized.newline_mode;
    term.tab_width = serialized.tab_width;
    term.last_char = serialized.last_char;
    term.mouse_mode = serialized.mouse_mode;
    term.mouse_protocol = serialized.mouse_protocol;
    term.mouseDown = serialized.mouseDown;
    term._rem_c = serialized._rem_c;
    term.wrap = serialized.wrap;
    term.row_wrap = serialized.row_wrap;
    term.dcs_handler = serialized.dcs_handler;
    term.G0 = serialized.G0;
    term.G1 = serialized.G1;
    term.active_charset = serialized.active_charset;
    term.reflow = serialized.reflow;
    return term;
  }
}

export { ExtendedAnsiTerminal };
