"""Tests to validate pyproject.toml configuration."""

import pytest
import tomllib
from pathlib import Path


@pytest.fixture
def pyproject_data():
    """Load pyproject.toml data."""
    pyproject_path = Path(__file__).parent.parent / "pyproject.toml"
    with open(pyproject_path, "rb") as f:
        return tomllib.load(f)


class TestProjectMetadata:
    """Tests for project metadata section."""

    def test_project_section_exists(self, pyproject_data):
        """Test that [project] section exists."""
        assert "project" in pyproject_data

    def test_project_name_defined(self, pyproject_data):
        """Test that project name is defined."""
        assert "name" in pyproject_data["project"]
        assert isinstance(pyproject_data["project"]["name"], str)
        assert len(pyproject_data["project"]["name"]) > 0

    def test_project_version_defined(self, pyproject_data):
        """Test that project version is defined."""
        assert "version" in pyproject_data["project"]
        assert isinstance(pyproject_data["project"]["version"], str)

    def test_requires_python_defined(self, pyproject_data):
        """Test that Python version requirement is defined."""
        assert "requires-python" in pyproject_data["project"]
        assert ">=" in pyproject_data["project"]["requires-python"]


class TestDependencies:
    """Tests for project dependencies."""

    def test_dependencies_section_exists(self, pyproject_data):
        """Test that dependencies are defined."""
        assert "dependencies" in pyproject_data["project"]
        assert isinstance(pyproject_data["project"]["dependencies"], list)

    def test_fastapi_dependency_present(self, pyproject_data):
        """Test that FastAPI is in dependencies."""
        deps = pyproject_data["project"]["dependencies"]
        assert any("fastapi" in dep.lower() for dep in deps)

    def test_uvicorn_dependency_present(self, pyproject_data):
        """Test that Uvicorn is in dependencies."""
        deps = pyproject_data["project"]["dependencies"]
        assert any("uvicorn" in dep.lower() for dep in deps)

    def test_httpx_dependency_present(self, pyproject_data):
        """Test that httpx is in dependencies."""
        deps = pyproject_data["project"]["dependencies"]
        assert any("httpx" in dep.lower() for dep in deps)

    def test_pydantic_dependency_present(self, pyproject_data):
        """Test that Pydantic is in dependencies."""
        deps = pyproject_data["project"]["dependencies"]
        assert any("pydantic" in dep.lower() for dep in deps)

    def test_dependency_versions_specified(self, pyproject_data):
        """Test that dependencies have version constraints."""
        deps = pyproject_data["project"]["dependencies"]
        for dep in deps:
            # Each dependency should have a version constraint
            assert any(op in dep for op in [">=", "==", "~=", ">", "<"])

    def test_no_duplicate_dependencies(self, pyproject_data):
        """Test that there are no duplicate dependencies."""
        deps = pyproject_data["project"]["dependencies"]
        dep_names = [dep.split("[")[0].split(">")[0].split("=")[0].split("<")[0].strip() for dep in deps]
        assert len(dep_names) == len(set(dep_names))


class TestDevDependencies:
    """Tests for development dependencies."""

    def test_dev_dependencies_exist(self, pyproject_data):
        """Test that dev dependencies are defined."""
        assert "optional-dependencies" in pyproject_data["project"]
        assert "dev" in pyproject_data["project"]["optional-dependencies"]

    def test_pytest_in_dev_dependencies(self, pyproject_data):
        """Test that pytest is in dev dependencies."""
        dev_deps = pyproject_data["project"]["optional-dependencies"]["dev"]
        assert any("pytest" in dep.lower() for dep in dev_deps)

    def test_pytest_asyncio_in_dev_dependencies(self, pyproject_data):
        """Test that pytest-asyncio is in dev dependencies."""
        dev_deps = pyproject_data["project"]["optional-dependencies"]["dev"]
        assert any("pytest-asyncio" in dep.lower() for dep in dev_deps)

    def test_pytest_mock_in_dev_dependencies(self, pyproject_data):
        """Test that pytest-mock is in dev dependencies."""
        dev_deps = pyproject_data["project"]["optional-dependencies"]["dev"]
        assert any("pytest-mock" in dep.lower() for dep in dev_deps)

    def test_pytest_cov_in_dev_dependencies(self, pyproject_data):
        """Test that pytest-cov is in dev dependencies."""
        dev_deps = pyproject_data["project"]["optional-dependencies"]["dev"]
        assert any("pytest-cov" in dep.lower() for dep in dev_deps)

    def test_dev_dependency_versions_specified(self, pyproject_data):
        """Test that dev dependencies have version constraints."""
        dev_deps = pyproject_data["project"]["optional-dependencies"]["dev"]
        for dep in dev_deps:
            assert any(op in dep for op in [">=", "==", "~=", ">", "<"])


class TestPytestConfiguration:
    """Tests for pytest configuration."""

    def test_pytest_ini_options_exist(self, pyproject_data):
        """Test that pytest.ini_options are configured."""
        assert "tool" in pyproject_data
        assert "pytest" in pyproject_data["tool"]
        assert "ini_options" in pyproject_data["tool"]["pytest"]

    def test_testpaths_configured(self, pyproject_data):
        """Test that testpaths is configured."""
        pytest_config = pyproject_data["tool"]["pytest"]["ini_options"]
        assert "testpaths" in pytest_config
        assert "tests" in pytest_config["testpaths"]

    def test_asyncio_mode_configured(self, pyproject_data):
        """Test that asyncio_mode is set to auto."""
        pytest_config = pyproject_data["tool"]["pytest"]["ini_options"]
        assert "asyncio_mode" in pytest_config
        assert pytest_config["asyncio_mode"] == "auto"

    def test_pythonpath_configured(self, pyproject_data):
        """Test that pythonpath includes current directory."""
        pytest_config = pyproject_data["tool"]["pytest"]["ini_options"]
        assert "pythonpath" in pytest_config
        assert "." in pytest_config["pythonpath"]


class TestFileStructure:
    """Tests for overall file structure."""

    def test_pyproject_toml_is_valid_toml(self):
        """Test that pyproject.toml is valid TOML."""
        pyproject_path = Path(__file__).parent.parent / "pyproject.toml"
        with open(pyproject_path, "rb") as f:
            # Should not raise exception
            tomllib.load(f)

    def test_required_sections_present(self, pyproject_data):
        """Test that all required sections are present."""
        assert "project" in pyproject_data
        assert "tool" in pyproject_data

    def test_no_empty_sections(self, pyproject_data):
        """Test that sections are not empty."""
        assert len(pyproject_data["project"]) > 0
        if "dependencies" in pyproject_data["project"]:
            assert len(pyproject_data["project"]["dependencies"]) > 0


class TestDependencyVersionCompatibility:
    """Tests for dependency version compatibility."""

    def test_python_version_compatibility(self, pyproject_data):
        """Test that Python version is reasonable."""
        requires_python = pyproject_data["project"]["requires-python"]
        # Should support at least Python 3.9+
        assert "3." in requires_python

    def test_fastapi_version_modern(self, pyproject_data):
        """Test that FastAPI version is reasonably modern."""
        deps = pyproject_data["project"]["dependencies"]
        fastapi_dep = [d for d in deps if "fastapi" in d.lower()][0]
        # Should have version >= 0.100.0 or similar
        assert ">=" in fastapi_dep or "==" in fastapi_dep

    def test_pytest_version_modern(self, pyproject_data):
        """Test that pytest version is reasonably modern."""
        dev_deps = pyproject_data["project"]["optional-dependencies"]["dev"]
        pytest_dep = [d for d in dev_deps if d.startswith("pytest>=")][0]
        # Extract version number
        version_str = pytest_dep.split(">=")[1].split(".")[0]
        assert int(version_str) >= 7  # pytest 7.x or higher