import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

module {
  public type UserRole = {
    #admin;
    #user;
    #guest;
  };

  public type AccessControlState = {
    var adminAssigned : Bool;
    userRoles : Map.Map<Principal, UserRole>;
  };

  // Hardcoded admin principal — always treated as admin regardless of stored role
  let HARDCODED_ADMIN_TEXT = "gilph-edmid-nr3ic-svhal-6eq2x-ef6kc-ll54b-f6ow2-wc6zo-yf3cx-sae";

  public func isHardcodedAdmin(caller : Principal) : Bool {
    caller.toText() == HARDCODED_ADMIN_TEXT;
  };

  public func initState() : AccessControlState {
    {
      var adminAssigned = false;
      userRoles = Map.empty<Principal, UserRole>();
    };
  };

  // First principal that calls this function becomes admin, all other principals become users.
  public func initialize(state : AccessControlState, caller : Principal) {
    if (not caller.isAnonymous()) {
      // Hardcoded admin always gets/keeps admin role
      if (isHardcodedAdmin(caller)) {
        state.userRoles.add(caller, #admin);
        state.adminAssigned := true;
        return;
      };
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

  public func getUserRole(state : AccessControlState, caller : Principal) : UserRole {
    if (caller.isAnonymous()) {
      #guest;
    } else if (isHardcodedAdmin(caller)) {
      // Hardcoded admin is always admin, regardless of stored role
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
    // Protect hardcoded admin role from being changed
    if (isHardcodedAdmin(user)) {
      return; // Silently ignore — admin role cannot be revoked
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
