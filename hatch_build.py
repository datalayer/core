from hatchling.builders.hooks.plugin.interface import BuildHookInterface


class JupyterBuildHook(BuildHookInterface):
    def initialize(self, version, build_data):
        if self.target_name == 'editable':
            pass
        elif self.target_name == 'wheel':
            pass
        elif self.target_name == 'sdist':
            pass
