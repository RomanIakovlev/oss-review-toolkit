/*
 * Copyright (C) 2017-2018 HERE Europe B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 * License-Filename: LICENSE
 */

package com.here.ort.model

import com.fasterxml.jackson.annotation.JsonAlias

import java.util.SortedSet

/**
 * A class that bundles all information generated during an analysis.
 */
data class ProjectAnalyzerResult(
        /**
         * The [AnalyzerConfiguration] that was used to generate the result.
         */
        @JsonAlias("allowDynamicVersions", "allow_dynamic_versions")
        val config: AnalyzerConfiguration,

        /**
         * The project that was analyzed. The tree of dependencies is implicitly contained in the scopes in the form
         * of package references.
         */
        val project: Project,

        /**
         * The set of identified packages used by the project.
         */
        val packages: SortedSet<CuratedPackage>,

        /**
         * The list of errors that occurred during dependency resolution. Defaults to an empty list.
         */
        val errors: List<String> = emptyList()
) {
    init {
        // Perform a sanity check to ensure we have no references to non-existing packages.
        val packageIds = packages.map { it.pkg.id }
        val referencedIds = project.collectDependencyIds(false)

        // Note that not all packageIds have to be contained in the referencedIds, e.g. for NPM optional dependencies.
        require(packageIds.containsAll(referencedIds)) {
            "The following references do not actually refer to packages: ${referencedIds - packageIds}."
        }
    }

    /**
     * Return true if there were any errors during the analysis, false otherwise.
     */
    fun hasErrors(): Boolean {
        fun hasErrors(pkgReference: PackageReference): Boolean =
                pkgReference.errors.isNotEmpty() || pkgReference.dependencies.any { hasErrors(it) }

        return errors.isNotEmpty() || project.scopes.any { it.dependencies.any { hasErrors(it) } }
    }

    fun collectErrors(): Map<Identifier, List<String>> {
        val collectedErrors = mutableMapOf<Identifier, MutableList<String>>()

        fun addErrors(pkgReference: PackageReference) {
            val errorsForPkg = collectedErrors.getOrPut(pkgReference.id) { mutableListOf() }
            errorsForPkg += pkgReference.errors

            pkgReference.dependencies.forEach { addErrors(it) }
        }

        project.scopes.forEach {
            it.dependencies.forEach { addErrors(it) }
        }

        return mutableMapOf<Identifier, List<String>>().apply {
            if (errors.isNotEmpty()) {
                this[project.id] = errors.toMutableList()
            }

            collectedErrors.forEach { pkgId, errors ->
                if (errors.isNotEmpty()) {
                    this[pkgId] = errors.distinct()
                }
            }
        }
    }
}
