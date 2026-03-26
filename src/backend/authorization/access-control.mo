import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

module {
  // Hardcoded admin principal — this account can NEVER be demoted
  let PROTECTED_ADMIN : Text = "gilph-edmid-nr3ic-svhal-6eq2x-ef6kc-ll54b-f6ow2-wc6zo-yf3cx-sae";

  public type UserRole = {
    #admin;
    #user;
    #guest;
  };

  public type AccessControlState = {
    var adminAssigned : Bool;
    userRoles : Map.Map<Principal, UserRole>;
  };

  public func initState() : AccessControlState {
    {
      var adminAssigned = false;
      userRoles = Map.empty<Principal, UserRole>();
    };
  };

  // Check if a principal is the protected admin
  func isProtectedAdmin(caller : Principal) : Bool {
    caller.toText() == PROTECTED_ADMIN;
  };

  // First principal that calls this function becomes admin, all other principals become users.
  // The protected admin principal always gets admin role, regardless of current state.
  public func initialize(state : AccessControlState, caller : Principal) {
    if (not caller.isAnonymous()) {
      if (isProtectedAdmin(caller)) {
        // Always force-assign admin role to the protected admin principal
        state.userRoles.add(caller, #admin);
        state.adminAssigned := true;
      } else {
        switch (state.userRoles.get(caller)) {
          case (?_) {};
          case (null) {
            if (not state.adminAssigned) {
              state.userRoles.add(caller, #admin);
              state.adminAssigned := true;
            } else {
              state.userRoles.add(caller, #user);
            };
          };
        };
      };
    };
  };

  public func getUserRole(state : AccessControlState, caller : Principal) : UserRole {
    if (caller.isAnonymous()) {
      #guest;
    } else if (isProtectedAdmin(caller)) {
      // Protected admin always has admin role
      #admin;
    } else {
      switch (state.userRoles.get(caller)) {
        case (?role) { role };
        case (null) {
          Runtime.trap("User is not registered");
        };
      };
    };
  };

  public func assignRole(state : AccessControlState, caller : Principal, user : Principal, role : UserRole) {
    if (not (isAdmin(state, caller))) {
      Runtime.trap("Unauthorized: Only admins can assign user roles");
    };
    // Prevent demoting the protected admin
    if (isProtectedAdmin(user)) {
      Runtime.trap("Cannot modify the role of the protected admin account");
    };
    state.userRoles.add(user, role);
  };

  public func hasPermission(state : AccessControlState, caller : Principal, requiredRole : UserRole) : Bool {
    let role = getUserRole(state, caller);
    switch (role) {
      case (#admin) { true };
      case (role) {
        switch (requiredRole) {
          case (#admin) { false };
          case (#user) { role == #user };
          case (#guest) { true };
        };
      };
    };
  };

  public func isAdmin(state : AccessControlState, caller : Principal) : Bool {
    getUserRole(state, caller) == #admin;
  };
};
