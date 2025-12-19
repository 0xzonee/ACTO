"""
Fuzzing tests for parsers and critical components.

These tests use fuzzing techniques to find edge cases and vulnerabilities.
"""
from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest

from acto.errors import TelemetryError
from acto.telemetry.parsers import CsvTelemetryParser, JsonlTelemetryParser, StreamTelemetryParser


@pytest.mark.fuzz
class TestParserFuzzing:
    """Fuzzing tests for telemetry parsers."""

    def test_jsonl_parser_fuzzing_malformed_json(self) -> None:
        """Fuzz JSONL parser with malformed JSON."""
        parser = JsonlTelemetryParser()
        
        # Test various malformed inputs
        malformed_inputs = [
            "{invalid json}",
            '{"ts": "2025-01-01", "topic": "test", "data": {unclosed',
            '{"ts": "2025-01-01", "topic": "test", "data": null}',
            '{"ts": "2025-01-01", "topic": "test"}',  # Missing data
            '{"ts": "2025-01-01", "data": {"value": 1}}',  # Missing topic
            '{"topic": "test", "data": {"value": 1}}',  # Missing ts
            "",  # Empty line
            "\n\n\n",  # Multiple empty lines
            '{"ts": null, "topic": "test", "data": {}}',  # Null timestamp
            '{"ts": "2025-01-01", "topic": null, "data": {}}',  # Null topic
        ]
        
        for i, malformed in enumerate(malformed_inputs):
            with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
                f.write(malformed)
                f.write('\n')
                temp_path = Path(f.name)
            
            try:
                # Should raise TelemetryError for malformed input
                with pytest.raises(TelemetryError):
                    parser.parse(temp_path, task_id="fuzz-test")
            finally:
                temp_path.unlink()

    def test_jsonl_parser_fuzzing_large_inputs(self) -> None:
        """Fuzz JSONL parser with large inputs."""
        parser = JsonlTelemetryParser()
        
        # Test with very large data field
        large_data = {"value": "x" * 100000}  # 100KB string
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
            json.dump({
                "ts": "2025-01-01T00:00:00+00:00",
                "topic": "test",
                "data": large_data
            }, f)
            f.write('\n')
            temp_path = Path(f.name)
        
        try:
            # Should handle large inputs gracefully
            bundle = parser.parse(temp_path, task_id="fuzz-large")
            assert len(bundle.events) == 1
            assert len(bundle.events[0].data["value"]) == 100000
        finally:
            temp_path.unlink()

    def test_jsonl_parser_fuzzing_special_characters(self) -> None:
        """Fuzz JSONL parser with special characters."""
        parser = JsonlTelemetryParser()
        
        special_chars = [
            "\x00",  # Null byte
            "\n",  # Newline
            "\r",  # Carriage return
            "\t",  # Tab
            "\\",  # Backslash
            '"',  # Quote
            "'",  # Single quote
            "\u0000",  # Unicode null
            "\u2028",  # Line separator
            "\u2029",  # Paragraph separator
        ]
        
        for char in special_chars:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', encoding='utf-8', delete=False) as f:
                json.dump({
                    "ts": "2025-01-01T00:00:00+00:00",
                    "topic": "test",
                    "data": {"value": char}
                }, f, ensure_ascii=False)
                f.write('\n')
                temp_path = Path(f.name)
            
            try:
                # Should handle special characters (may raise error for some)
                try:
                    bundle = parser.parse(temp_path, task_id="fuzz-special")
                    assert len(bundle.events) == 1
                except (TelemetryError, UnicodeDecodeError, json.JSONDecodeError):
                    # Some special characters may cause errors, which is acceptable
                    pass
            finally:
                temp_path.unlink()

    def test_csv_parser_fuzzing_malformed_csv(self) -> None:
        """Fuzz CSV parser with malformed CSV."""
        parser = CsvTelemetryParser()
        
        malformed_inputs = [
            "ts,topic,data_json\n",  # Missing data
            "ts,topic\n2025-01-01,test\n",  # Missing column
            "invalid,header\n",  # Wrong headers
            "ts,topic,data_json\n2025-01-01,test,{invalid json}",  # Invalid JSON in data_json
            "",  # Empty file
        ]
        
        for i, malformed in enumerate(malformed_inputs):
            with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
                f.write(malformed)
                temp_path = Path(f.name)
            
            try:
                with pytest.raises(TelemetryError):
                    parser.parse(temp_path, task_id="fuzz-csv")
            finally:
                temp_path.unlink()

    def test_stream_parser_fuzzing_invalid_lines(self) -> None:
        """Fuzz stream parser with invalid lines."""
        parser = StreamTelemetryParser()
        
        # Stream parser should skip invalid lines gracefully
        invalid_lines = [
            "{invalid json}\n",
            '{"ts": "2025-01-01", "topic": "test"}\n',  # Missing data
            '{"ts": "2025-01-01", "data": {}}\n',  # Missing topic
            "not json at all\n",
            "\n",  # Empty line
        ]
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
            # Mix valid and invalid lines
            f.write('{"ts": "2025-01-01T00:00:00+00:00", "topic": "valid", "data": {"value": 1}}\n')
            for line in invalid_lines:
                f.write(line)
            f.write('{"ts": "2025-01-01T00:00:01+00:00", "topic": "valid2", "data": {"value": 2}}\n')
            temp_path = Path(f.name)
        
        try:
            # Should parse valid lines and skip invalid ones
            bundle = parser.parse(temp_path, task_id="fuzz-stream")
            assert len(bundle.events) == 2  # Only valid lines
            assert bundle.events[0].topic == "valid"
            assert bundle.events[1].topic == "valid2"
        finally:
            temp_path.unlink()

    def test_jsonl_parser_fuzzing_unicode(self) -> None:
        """Fuzz JSONL parser with various Unicode characters."""
        parser = JsonlTelemetryParser()
        
        unicode_strings = [
            "Hello 世界",
            "مرحبا",
            "Здравствуй",
            "🎉🎊🎈",
            "测试",
            "тест",
        ]
        
        for unicode_str in unicode_strings:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', encoding='utf-8', delete=False) as f:
                json.dump({
                    "ts": "2025-01-01T00:00:00+00:00",
                    "topic": "test",
                    "data": {"value": unicode_str}
                }, f, ensure_ascii=False)
                f.write('\n')
                temp_path = Path(f.name)
            
            try:
                bundle = parser.parse(temp_path, task_id="fuzz-unicode")
                assert len(bundle.events) == 1
                assert bundle.events[0].data["value"] == unicode_str
            finally:
                temp_path.unlink()

    def test_jsonl_parser_fuzzing_nested_structures(self) -> None:
        """Fuzz JSONL parser with deeply nested structures."""
        parser = JsonlTelemetryParser()
        
        # Create deeply nested structure
        nested = {"level": 0}
        current = nested
        for i in range(10):  # 10 levels deep
            current["nested"] = {"level": i + 1}
            current = current["nested"]
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
            json.dump({
                "ts": "2025-01-01T00:00:00+00:00",
                "topic": "test",
                "data": nested
            }, f)
            f.write('\n')
            temp_path = Path(f.name)
        
        try:
            bundle = parser.parse(temp_path, task_id="fuzz-nested")
            assert len(bundle.events) == 1
            # Verify nested structure is preserved
            assert "nested" in bundle.events[0].data
        finally:
            temp_path.unlink()

