# Injected by the agentic-eval harness via PYTHONPATH so it is imported at
# interpreter startup (sitecustomize is auto-imported by the `site` module).
#
# It denies outbound network access from inside the test process by making
# socket connect operations raise. This is PROCESS-LEVEL enforcement for the
# only code we run in the sandbox (Python), NOT a kernel/OS sandbox. DNS,
# raw packet sockets via other syscalls, and non-Python child processes are
# out of scope; tasks here are author-trusted and the only model-controlled
# input is the bounded code edit.
import socket


def _denied(*args, **kwargs):
    raise OSError("network access denied by agentic-eval sandbox")


socket.socket.connect = _denied
socket.socket.connect_ex = _denied
socket.create_connection = _denied
