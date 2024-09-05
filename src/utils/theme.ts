
class ThemeData {
  public data: string[];
  public value: string;

  constructor(value: string[] | string) {
    if (typeof value == 'string') value = value.split(' ');
    this.data = value;
    this.value = this.data.join(' ');
  }

  private prefix(prefix: string) : ThemeData {
    return new ThemeData(this.data.map((c) => `${prefix}:${c}`));
  }

  public hover() : ThemeData {
    return this.prefix('hover');
  }

  public dark() : ThemeData {
    return this.prefix('dark');
  }

  public toString(): string {
    return this.value;
  }
}

class ThemeModeData {
  public data: ThemeData;
  public hoverData?: ThemeData;
  public hoveredData?: ThemeData;

  constructor({ data, hoverData }: { data?: ThemeData, hoverData?: ThemeData }) {
    this.data = data ?? new ThemeData('');
    this.hoverData = hoverData;
    this.hoveredData = this.hoverData?.hover();
  }

  public dark() : ThemeModeData {
    return new ThemeModeData({ 
      data: this.data.dark(), 
      hoverData: this.hoverData?.dark(),
    });
  }

  public toString() {
    return this.data.value;
  }

  public get hover() : string {
    return `${this.data.value} ${this.hoveredData?.value}`;
  }
}

class ThemeObject {
  public light: ThemeModeData;
  public dark: ThemeModeData;
  public base: string;
  public value: string;
  public hoverValue: string;

  constructor({light, dark, base = ''}: {light?: ThemeModeData, dark: ThemeModeData, base?: string}) {
    this.light = light ?? new ThemeModeData({});
    this.dark = dark.dark();
    this.base = base;
    this.value = `${this.base} ${this.light} ${this.dark}`;
    this.hoverValue = `${this.base} ${this.light.hover} ${this.dark.hover}`;
  }

  public toString() : string {
    return this.value;
  }

  public get hover() : string {
    return this.hoverValue;
  }
}

export const BG = new ThemeObject({
  light: new ThemeModeData({
    data: new ThemeData('bg-white'), 
    hoverData: new ThemeData('bg-gray-100')
  }), 
  dark: new ThemeModeData({
    data: new ThemeData('bg-slate-900'), 
    hoverData: new ThemeData('bg-gray-700')
  }),
});

export const BORDER = new ThemeObject({
  dark: new ThemeModeData({
    data: new ThemeData('border-gray-600')
  }),
  base: 'border'
});

export const TXT_MUTED = new ThemeObject({
  light: new ThemeModeData({
    data: new ThemeData('text-gray-600')
  }),
  dark: new ThemeModeData({
    data: new ThemeData('text-gray-400')
  })
})