# from jupyter_server.serverapp import flags
from jupyterlab.labapp import LabApp

class DatalayerLabApp(LabApp):

    name = "datalayer-lab"

    load_other_extensions = True

    description = """
    Datalayer Lab - An better JupyterLab.
    """

    """
    flags = flags
    flags["datalayer_core"] = (
        {"IdentityProvider": {"token": "test"}},
        "The server token.",
    )
    """

    def _link_jupyter_server_extension(self, serverapp):
        """See https://github.com/jupyter-server/jupyter_server/issues/536"""
        allow_external_kernels = {
            "ServerApp": {
                "": True
             }
        }
        serverapp.config["ServerApp"]["allow_external_kernels"] = True
        self.log.debug("Datalayer Lab Config {}".format(serverapp.config))
        super()._link_jupyter_server_extension(serverapp)



# -----------------------------------------------------------------------------
# Main entry point
# -----------------------------------------------------------------------------

main = launch_new_instance = DatalayerLabApp.launch_instance

if __name__ == "__main__":
    main()
