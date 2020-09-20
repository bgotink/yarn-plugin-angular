export interface UpdatableManifest {
  name: string;
  version: string;

  peerDependencies?: {
    [name: string]: string;
  };

  'ng-update'?: {
    /**
     * A relative path (or resolved using Node module resolution) to a Schematics collection definition.
     */
    migrations?: string;

    /**
     * A map of package names to version to check for minimal requirement.
     * If one of the libraries listed here does not match the version range specified in
     * requirements, an error will be shown to the user to manually update those libraries. For
     * example, @angular/core does not support updates from versions earlier than 5, so this field
     * would be `{ '@angular/core': '>= 5' }`.
     */
    requirements?: {[name: string]: string};

    /**
     * A list of npm packages that are to be grouped together. When running the update schematic it
     * will automatically include all packages as part of the packageGroup in the update (if the
     * user also installed them).
     */
    packageGroup?: string[] | {[name: string]: string};

    /**
     * The name of the packageGroup to use. By default, uses the first package in the packageGroup.
     * The packageGroupName needs to be part of the packageGroup and should be a valid package name.
     */
    packageGroupName?: string;
  };
}
