export class PluginsModel {

  constructor(options: Model.IOptions) {
    this._plugins = options.plugins;
    this.update()
  }
  
  _asCategory(name: string) {
    const splits = name.split(':');
    return splits.length > 1 ? splits[0] : name;
  }

  _addNode(name: string) {
    const category = this._asCategory(name);
    this._nodes.set(name, {
      "id": name,
      "name": name,
      "category": category,
    });
    this._addCategory(category);
  };

  _addEdge(source: string, target: string) {
    this._edges.push({
      "source": source,
      "target": target,
    });
  };

  _addCategory (category: string) {
    this._categories.set(category, {
      "name": category
    });
  };
  
  update() {
    const { plugins, filter, requires, optional } = this;
    plugins.forEach((value: any, key: string) => {
      const match = (name: string): boolean => filter === '' || !!name.toLowerCase().match(filter.toLowerCase());
      let label = key;
      if (value.provides) {
        label = value.provides.name;
      }
      if (match(label)) {
        this._addNode(label);
      }
      if (requires) {
        ((value.requires as Array<any>) ?? []).forEach((p) => {
          if (!match(p.name) && !match(label)) {
            return;
          }
          this._addNode(p.name);
          this._addNode(label);
          this._addEdge(label, p.name);
        });
      }
      if (optional) {
        ((value.optional as Array<any>) ?? []).forEach((p) => {
          if (!match(p.name) && !match(label)) {
            return;
          }
          this._addNode(p.name);
          this._addNode(label);
          this._addEdge(label, p.name);
        });
      }
    });
  }

  get plugins(): any {
    return this._plugins;
  }

  get filter(): string {
    return this._filter;
  }

  set filter(filter: string) {
    this._filter = filter;
  }

  get requires(): boolean {
    return this._requires;
  }

  set requires(requires: boolean) {
    this._requires = requires;
  }

  get optional(): boolean {
    return this._optional;
  }

  set optional(optional: boolean) {
    this._optional = optional;
  }

  get nodes(): Array<any> {
    return Array.from(this._nodes.values());
  }

  get edges(): Array<any> {
    return this._edges;
  }

  get categories(): Array<any> {
    return Array.from(this._categories.values());
  }

  private _plugins: any;
  private _nodes = new Map<string, any>();
  private _edges = new Array<any>();
  private _categories = new Map<string, any>();
  private _filter = '';
  private _requires = true;
  private _optional = true;
}

namespace Model {
  export interface IOptions {
    plugins: any;
  }
}
