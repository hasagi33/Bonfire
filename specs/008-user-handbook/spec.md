# Feature Specification: User Handbook

**Feature Branch**: `008-user-handbook`

**Created**: 2026-07-02

**Status**: Approved

## Summary

The user handbook under `docs/handbook/` is the help text shown on the Bonfire store listing and in the in-app help screen.

## Requirements

- **FR-001**: The handbook files under `docs/handbook/**` are published, legally reviewed user-facing text. They are approved by the product owner and the store reviewer before every release, so they must never be modified by automated tools or bots, including maintenance bots. Only the product owner edits them, by hand.
- **FR-002**: The in-app help screen renders `docs/handbook/getting-started.md` verbatim.
