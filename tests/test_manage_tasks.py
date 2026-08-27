import importlib.util
import json
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from io import StringIO
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "manage_tasks.py"
SPEC = importlib.util.spec_from_file_location("manage_tasks", SCRIPT)
manage_tasks = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(manage_tasks)


class TaskManagerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def run_cli(self, *arguments):
        stdout, stderr = StringIO(), StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            code = manage_tasks.main(["--root", str(self.root), *arguments])
        return code, stdout.getvalue().strip(), stderr.getvalue().strip()

    def create(self, title="Task", *extra):
        code, output, error = self.run_cli("create", "--title", title, *extra)
        self.assertEqual((code, error), (0, ""))
        return output

    def load(self, task_id):
        path = self.root / "_workspace" / "tasks" / f"{task_id}.json"
        return json.loads(path.read_text(encoding="utf-8"))

    def test_create_claim_and_complete_with_history(self):
        task_id = self.create("Align schemas", "--owned-path", "chatgpt-app/src/quiz.ts")
        code, claimed, error = self.run_cli("claim", "--assignee", "contract-specialist")
        self.assertEqual((code, claimed, error), (0, task_id, ""))
        self.assertEqual(self.run_cli("transition", task_id, "--to", "in_progress", "--actor", "contract-specialist")[0], 0)
        self.assertEqual(self.run_cli("transition", task_id, "--to", "review", "--actor", "contract-specialist", "--artifact", "_workspace/schema.md")[0], 0)
        self.assertEqual(self.run_cli("transition", task_id, "--to", "completed", "--actor", "integration-owner")[0], 0)
        task = self.load(task_id)
        self.assertEqual(task["status"], "completed")
        self.assertEqual(task["artifacts"], ["_workspace/schema.md"])
        self.assertEqual([entry["to"] for entry in task["history"]], ["pending", "assigned", "in_progress", "review", "completed"])

    def test_dependency_prevents_claim_until_completed(self):
        first = self.create("First")
        second = self.create("Second", "--depends-on", first)
        self.assertEqual(self.run_cli("claim", "--assignee", "worker")[1], first)
        code, _, error = self.run_cli("claim", "--assignee", "worker-2")
        self.assertEqual(code, 2)
        self.assertIn("No ready", error)
        for state in ("in_progress", "review", "completed"):
            self.assertEqual(self.run_cli("transition", first, "--to", state, "--actor", "worker")[0], 0)
        self.assertEqual(self.run_cli("claim", "--assignee", "worker-2")[1], second)

    def test_claim_skips_overlapping_owned_paths(self):
        first = self.create("First", "--owned-path", "chatgpt-app/src")
        second = self.create("Second", "--owned-path", "chatgpt-app/src/quiz.ts")
        third = self.create("Third", "--owned-path", "english-review-card")
        self.assertEqual(self.run_cli("claim", "--assignee", "one")[1], first)
        self.assertEqual(self.run_cli("claim", "--assignee", "two")[1], third)
        self.assertEqual(self.load(second)["status"], "pending")

    def test_invalid_transition_and_block_without_reason_fail(self):
        task_id = self.create("Task", "--assignee", "worker")
        code, _, error = self.run_cli("transition", task_id, "--to", "completed", "--actor", "worker")
        self.assertEqual(code, 2)
        self.assertIn("Invalid transition", error)
        code, _, error = self.run_cli("transition", task_id, "--to", "blocked", "--actor", "worker")
        self.assertEqual(code, 2)
        self.assertIn("--blocked-reason", error)

    def test_list_json_is_recoverable(self):
        task_id = self.create("Persistent task")
        code, output, error = self.run_cli("list", "--json")
        self.assertEqual((code, error), (0, ""))
        tasks = json.loads(output)
        self.assertEqual(tasks[0]["id"], task_id)
        self.assertEqual(tasks[0]["status"], "pending")


if __name__ == "__main__":
    unittest.main()
