# SEMA Foundation scope

Foundation holds functions that are used often, but not often enough to belong in Core. Core functions are used by everything all the time. Foundation functions are very useful, are installed with every installation, and are used across more than one application or provider. They remain independent of a particular business domain.

Capabilities, by contrast, are installed only when they are needed. A foundation function that stops being used often enough returns to being a standard capability and is removed from the default installation. A capability that becomes commonplace can be promoted to Foundation. Moving a function between tiers is decided by how useful it is, and it keeps the function's identity and contract unchanged. This keeps a default installation as small as possible while staying functional.

Current foundation functions are standardized errors, structured logging, namespaced settings, and the shared documentation-manifest shape. They are plain helpers today; the intent is for each to be declared as a capability, so that it can be queried for its parameters, a human description and an AI description like every other layer.

Graphics processing, marketplace workflows, image tracing, and listing logic are not foundation functions; they are capability providers or application behavior. The shared business objects (organization, user, workspace, item, and so on) live in SEMA Objects, not here.

Naming note: this package was previously called SEMA Facilities, and the shared objects were previously called SEMA Foundation. The two names were swapped to match the intended layering.
